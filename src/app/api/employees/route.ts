import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { escapeSearchInput } from '@/lib/sql-utils';
import { employeeListSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate input with zod
    const validationResult = employeeListSchema.safeParse({
      cursor: searchParams.get('cursor') || undefined,
      page: searchParams.get('page') || undefined,
      size: searchParams.get('size') || undefined,
      search: searchParams.get('search') || undefined,
      department: searchParams.get('department') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { cursor, page: pageParam, size, search, department, sortBy, sortOrder } = validationResult.data;

    // Validate sortBy to prevent injection
    const validSorts: Record<string, string> = {
      emp_no: 'e.emp_no',
      first_name: 'e.first_name',
      last_name: 'e.last_name',
      hire_date: 'e.hire_date',
      salary: 'latest_salary.salary',
      dept_name: 'latest_dept.dept_name',
      title: 'latest_title.title',
    };
    const orderCol = validSorts[sortBy] || 'e.emp_no';
    const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';
    const isDesc = sortOrder === 'desc';

    const escapedSearch = escapeSearchInput(search);
    const usePage = !!pageParam;
    const page = usePage ? Math.max(1, pageParam) : 1;
    const offset = usePage ? (page - 1) * size : 0;

    let employees;
    let total = 0;

    // Determine which query to run based on parameters
    const hasCursor = !usePage && cursor;
    const hasSearch = escapedSearch.length > 0;
    const hasDepartment = department.length > 0;

    if (hasCursor && hasSearch && hasDepartment) {
      const [cursorHireDate, cursorEmpNo] = cursor!.split('_');
      if (cursorHireDate && cursorEmpNo) {
        // Cursor + search + department
        const countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int AS count
          FROM employees e
          WHERE EXISTS (
            SELECT 1 FROM dept_emp de 
            JOIN departments d2 ON d2.dept_no = de.dept_no 
            WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
          )
          AND (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
          AND (${isDesc} 
            ? (e.hire_date < ${cursorHireDate}::date OR (e.hire_date = ${cursorHireDate}::date AND e.emp_no < ${parseInt(cursorEmpNo)}))
            : (e.hire_date > ${cursorHireDate}::date OR (e.hire_date = ${cursorHireDate}::date AND e.emp_no > ${parseInt(cursorEmpNo)}))
          )
        `;
        total = countResult[0]?.count || 0;

        const empResult = await prisma.$queryRaw<{
          emp_no: number;
          first_name: string;
          last_name: string;
          gender: string;
          birth_date: string;
          hire_date: string;
          current_department: string | null;
          current_title: string | null;
          current_salary: number | null;
        }[]>`
          WITH latest_dept_emp AS (
            SELECT emp_no, dept_no, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM dept_emp
          ),
          latest_salaries AS (
            SELECT emp_no, salary, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM salaries
          ),
          latest_titles AS (
            SELECT emp_no, title, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM titles
          )
          SELECT
            e.emp_no, e.first_name, e.last_name, e.gender::text,
            e.birth_date::text, e.hire_date::text,
            d.dept_name as current_department,
            lt.title as current_title,
            ls.salary::int as current_salary
          FROM employees e
          LEFT JOIN latest_dept_emp lde ON e.emp_no = lde.emp_no AND lde.rn = 1
          LEFT JOIN departments d ON lde.dept_no = d.dept_no
          LEFT JOIN latest_salaries ls ON e.emp_no = ls.emp_no AND ls.rn = 1
          LEFT JOIN latest_titles lt ON e.emp_no = lt.emp_no AND lt.rn = 1
          WHERE d.dept_name = ${department}
          AND (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
          AND (${isDesc}
            ? (e.hire_date < ${cursorHireDate}::date OR (e.hire_date = ${cursorHireDate}::date AND e.emp_no < ${parseInt(cursorEmpNo)}))
            : (e.hire_date > ${cursorHireDate}::date OR (e.hire_date = ${cursorHireDate}::date AND e.emp_no > ${parseInt(cursorEmpNo)}))
          )
          ORDER BY ${orderCol} ${orderDir}
          LIMIT ${size}
        `;
        employees = empResult;
      }
    }

    // Fallback: pagination mode with various filter combinations
    if (!employees) {
      if (hasSearch && hasDepartment) {
        const countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int AS count
          FROM employees e
          WHERE EXISTS (
            SELECT 1 FROM dept_emp de 
            JOIN departments d2 ON d2.dept_no = de.dept_no 
            WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
          )
          AND (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
        `;
        total = countResult[0]?.count || 0;

        const empResult = await prisma.$queryRaw<{
          emp_no: number;
          first_name: string;
          last_name: string;
          gender: string;
          birth_date: string;
          hire_date: string;
          current_department: string | null;
          current_title: string | null;
          current_salary: number | null;
        }[]>`
          WITH latest_dept_emp AS (
            SELECT emp_no, dept_no, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM dept_emp
          ),
          latest_salaries AS (
            SELECT emp_no, salary, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM salaries
          ),
          latest_titles AS (
            SELECT emp_no, title, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM titles
          )
          SELECT
            e.emp_no, e.first_name, e.last_name, e.gender::text,
            e.birth_date::text, e.hire_date::text,
            d.dept_name as current_department,
            lt.title as current_title,
            ls.salary::int as current_salary
          FROM employees e
          LEFT JOIN latest_dept_emp lde ON e.emp_no = lde.emp_no AND lde.rn = 1
          LEFT JOIN departments d ON lde.dept_no = d.dept_no
          LEFT JOIN latest_salaries ls ON e.emp_no = ls.emp_no AND ls.rn = 1
          LEFT JOIN latest_titles lt ON e.emp_no = lt.emp_no AND lt.rn = 1
          WHERE d.dept_name = ${department}
          AND (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
          ORDER BY ${orderCol} ${orderDir}
          LIMIT ${size} OFFSET ${offset}
        `;
        employees = empResult;
      } else if (hasSearch) {
        const countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int AS count
          FROM employees e
          WHERE (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
        `;
        total = countResult[0]?.count || 0;

        const empResult = await prisma.$queryRaw<{
          emp_no: number;
          first_name: string;
          last_name: string;
          gender: string;
          birth_date: string;
          hire_date: string;
          current_department: string | null;
          current_title: string | null;
          current_salary: number | null;
        }[]>`
          WITH latest_dept_emp AS (
            SELECT emp_no, dept_no, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM dept_emp
          ),
          latest_salaries AS (
            SELECT emp_no, salary, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM salaries
          ),
          latest_titles AS (
            SELECT emp_no, title, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM titles
          )
          SELECT
            e.emp_no, e.first_name, e.last_name, e.gender::text,
            e.birth_date::text, e.hire_date::text,
            d.dept_name as current_department,
            lt.title as current_title,
            ls.salary::int as current_salary
          FROM employees e
          LEFT JOIN latest_dept_emp lde ON e.emp_no = lde.emp_no AND lde.rn = 1
          LEFT JOIN departments d ON lde.dept_no = d.dept_no
          LEFT JOIN latest_salaries ls ON e.emp_no = ls.emp_no AND ls.rn = 1
          LEFT JOIN latest_titles lt ON e.emp_no = lt.emp_no AND lt.rn = 1
          WHERE (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
          ORDER BY ${orderCol} ${orderDir}
          LIMIT ${size} OFFSET ${offset}
        `;
        employees = empResult;
      } else if (hasDepartment) {
        const countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int AS count
          FROM employees e
          WHERE EXISTS (
            SELECT 1 FROM dept_emp de 
            JOIN departments d2 ON d2.dept_no = de.dept_no 
            WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
          )
        `;
        total = countResult[0]?.count || 0;

        const empResult = await prisma.$queryRaw<{
          emp_no: number;
          first_name: string;
          last_name: string;
          gender: string;
          birth_date: string;
          hire_date: string;
          current_department: string | null;
          current_title: string | null;
          current_salary: number | null;
        }[]>`
          WITH latest_dept_emp AS (
            SELECT emp_no, dept_no, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM dept_emp
          ),
          latest_salaries AS (
            SELECT emp_no, salary, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM salaries
          ),
          latest_titles AS (
            SELECT emp_no, title, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM titles
          )
          SELECT
            e.emp_no, e.first_name, e.last_name, e.gender::text,
            e.birth_date::text, e.hire_date::text,
            d.dept_name as current_department,
            lt.title as current_title,
            ls.salary::int as current_salary
          FROM employees e
          LEFT JOIN latest_dept_emp lde ON e.emp_no = lde.emp_no AND lde.rn = 1
          LEFT JOIN departments d ON lde.dept_no = d.dept_no
          LEFT JOIN latest_salaries ls ON e.emp_no = ls.emp_no AND ls.rn = 1
          LEFT JOIN latest_titles lt ON e.emp_no = lt.emp_no AND lt.rn = 1
          WHERE d.dept_name = ${department}
          ORDER BY ${orderCol} ${orderDir}
          LIMIT ${size} OFFSET ${offset}
        `;
        employees = empResult;
      } else {
        // No filters
        const countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int AS count FROM employees
        `;
        total = countResult[0]?.count || 0;

        const empResult = await prisma.$queryRaw<{
          emp_no: number;
          first_name: string;
          last_name: string;
          gender: string;
          birth_date: string;
          hire_date: string;
          current_department: string | null;
          current_title: string | null;
          current_salary: number | null;
        }[]>`
          WITH latest_dept_emp AS (
            SELECT emp_no, dept_no, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM dept_emp
          ),
          latest_salaries AS (
            SELECT emp_no, salary, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM salaries
          ),
          latest_titles AS (
            SELECT emp_no, title, from_date,
                   ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
            FROM titles
          )
          SELECT
            e.emp_no, e.first_name, e.last_name, e.gender::text,
            e.birth_date::text, e.hire_date::text,
            d.dept_name as current_department,
            lt.title as current_title,
            ls.salary::int as current_salary
          FROM employees e
          LEFT JOIN latest_dept_emp lde ON e.emp_no = lde.emp_no AND lde.rn = 1
          LEFT JOIN departments d ON lde.dept_no = d.dept_no
          LEFT JOIN latest_salaries ls ON e.emp_no = ls.emp_no AND ls.rn = 1
          LEFT JOIN latest_titles lt ON e.emp_no = lt.emp_no AND lt.rn = 1
          ORDER BY ${orderCol} ${orderDir}
          LIMIT ${size} OFFSET ${offset}
        `;
        employees = empResult;
      }
    }

    const totalPages = Math.max(1, Math.ceil(total / size));
    let nextCursor: string | null = null;
    if (!usePage && employees.length === size && total > size) {
      const last = employees[employees.length - 1];
      nextCursor = `${last.hire_date}_${last.emp_no}`;
    }

    return NextResponse.json({
      data: employees,
      pagination: {
        page: usePage ? page : undefined,
        totalPages: usePage ? totalPages : undefined,
        totalItems: total,
        nextCursor,
        hasMore: employees.length === size,
        pageSize: size,
      },
    });
  } catch (error) {
    console.error('Employees API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
