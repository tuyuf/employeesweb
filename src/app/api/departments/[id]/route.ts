import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { departmentIdSchema, departmentEmployeesSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  
  // Validate department ID
  const idValidation = departmentIdSchema.safeParse({ id });
  if (!idValidation.success) {
    return NextResponse.json(
      { error: 'Invalid department ID', details: idValidation.error.format() },
      { status: 400 }
    );
  }
  
  const deptId = idValidation.data.id;
  
  // Validate query parameters
  const queryValidation = departmentEmployeesSchema.safeParse({
    page: searchParams.get('page') || undefined,
    size: searchParams.get('size') || undefined,
  });
  
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryValidation.error.format() },
      { status: 400 }
    );
  }
  
  const { page, size } = queryValidation.data;

  try {
    const department = await prisma.department.findUnique({
      where: { dept_no: deptId },
      include: {
        dept_managers: {
          orderBy: { from_date: 'asc' },
          include: {
            employee: {
              select: { emp_no: true, first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const stats = await prisma.$queryRaw<[{ employee_count: number; avg_salary: number }]>`
      WITH latest_salaries AS (
        SELECT emp_no, salary,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM salaries
      )
      SELECT
        COUNT(*)::int AS employee_count,
        COALESCE(AVG(ls.salary)::int, 0) AS avg_salary
      FROM dept_emp de
      LEFT JOIN latest_salaries ls ON ls.emp_no = de.emp_no AND ls.rn = 1
      WHERE de.dept_no = ${deptId} AND de.to_date = '9999-01-01'::date
    `;

    const { employee_count, avg_salary } = stats[0];
    const totalPages = Math.max(1, Math.ceil(employee_count / size));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * size;

    const employees = await prisma.$queryRaw<
      {
        emp_no: number;
        first_name: string;
        last_name: string;
        gender: string;
        birth_date: string;
        hire_date: string;
        current_salary: number | null;
        current_title: string | null;
      }[]
    >`
      WITH latest_salaries AS (
        SELECT emp_no, salary,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM salaries
      ),
      latest_titles AS (
        SELECT emp_no, title,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM titles
      )
      SELECT e.emp_no, e.first_name, e.last_name, e.gender::text,
             e.birth_date::text, e.hire_date::text,
             ls.salary::int AS current_salary,
             lt.title AS current_title
      FROM dept_emp de
      JOIN employees e ON e.emp_no = de.emp_no
      LEFT JOIN latest_salaries ls ON ls.emp_no = e.emp_no AND ls.rn = 1
      LEFT JOIN latest_titles lt ON lt.emp_no = e.emp_no AND lt.rn = 1
      WHERE de.dept_no = ${deptId} AND de.to_date = '9999-01-01'::date
      ORDER BY e.hire_date ASC, e.emp_no ASC
      OFFSET ${offset}
      LIMIT ${size}
    `;

    const currentManagerRecord = department.dept_managers.find(
      m => m.to_date.getFullYear() === 9999
    );

    const managers = department.dept_managers.map(dm => ({
      emp_no: dm.employee.emp_no,
      first_name: dm.employee.first_name,
      last_name: dm.employee.last_name,
      from_date: dm.from_date,
      to_date: dm.to_date,
    }));

    return NextResponse.json({
      dept_no: department.dept_no,
      dept_name: department.dept_name,
      employee_count,
      avg_salary,
      current_manager: currentManagerRecord
        ? {
            emp_no: currentManagerRecord.employee.emp_no,
            first_name: currentManagerRecord.employee.first_name,
            last_name: currentManagerRecord.employee.last_name,
          }
        : null,
      managers,
      employees,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalPages,
        totalItems: employee_count,
      },
    });
  } catch (error) {
    console.error(`Error fetching department ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch department details' },
      { status: 500 }
    );
  }
}
