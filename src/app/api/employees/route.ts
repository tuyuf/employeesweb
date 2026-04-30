import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function escapeSearchInput(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const pageParam = searchParams.get('page');
    const size = Math.min(parseInt(searchParams.get('size') || '20'), 100);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const sortBy = searchParams.get('sortBy') || 'emp_no';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

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
    const page = usePage ? Math.max(1, parseInt(pageParam!)) : 1;
    const offset = usePage ? (page - 1) * size : 0;

    let cursorCondition = '';
    let cursorParams: (string | number)[] = [];
    let limitClause = `LIMIT ${size}`;

    if (usePage) {
      limitClause = `LIMIT ${size} OFFSET ${offset}`;
    } else if (cursor) {
      const [cursorHireDate, cursorEmpNo] = cursor.split('_');
      if (cursorHireDate && cursorEmpNo) {
        if (isDesc) {
          cursorCondition = `AND (e.hire_date < $1::date OR (e.hire_date = $1::date AND e.emp_no < $2::int))`;
        } else {
          cursorCondition = `AND (e.hire_date > $1::date OR (e.hire_date = $1::date AND e.emp_no > $2::int))`;
        }
        cursorParams = [cursorHireDate, cursorEmpNo];
      }
    }

    const searchCondition = escapedSearch
      ? `AND (e.first_name ILIKE '%' || $${cursorParams.length + 1} || '%' OR e.last_name ILIKE '%' || $${cursorParams.length + 1} || '%' OR e.emp_no::text LIKE $${cursorParams.length + 1} || '%')`
      : '';

    const deptCondition = department
      ? `AND d.dept_name = $${cursorParams.length + (escapedSearch ? 2 : 1)}`
      : '';

    const deptExistsCondition = department
      ? `AND EXISTS (SELECT 1 FROM dept_emp de JOIN departments d2 ON d2.dept_no = de.dept_no WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = $${cursorParams.length + (escapedSearch ? 2 : 1)})`
      : '';

    const searchParam = escapedSearch || null;
    const deptParam = department || null;

    const baseParams = [...cursorParams];
    if (searchParam) baseParams.push(searchParam);
    if (deptParam) baseParams.push(deptParam);

    const countResult = await prisma.$queryRawUnsafe<[{ count: number }]>(
      `
      SELECT COUNT(*)::int AS count
      FROM employees e
      WHERE 1=1 ${cursorCondition} ${searchCondition} ${deptExistsCondition}
    `,
      ...baseParams
    );

    const total = countResult[0]?.count || 0;

    const employees = await prisma.$queryRawUnsafe<
      {
        emp_no: number;
        first_name: string;
        last_name: string;
        gender: string;
        birth_date: string;
        hire_date: string;
        current_department: string | null;
        current_title: string | null;
        current_salary: number | null;
      }[]
    >(
      `
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
      WHERE 1=1 ${cursorCondition} ${searchCondition} ${deptCondition}
      ORDER BY ${orderCol} ${orderDir}
      ${limitClause}
    `,
      ...baseParams
    );

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