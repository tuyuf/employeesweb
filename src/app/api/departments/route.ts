import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { DepartmentSummary } from '@/types';

export async function GET() {
  try {
    const departments = await prisma.$queryRaw<DepartmentSummary[]>`
      WITH latest_dept_emp AS (
        SELECT emp_no, dept_no, from_date,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM employees_temp.dept_emp
      ),
      latest_salaries AS (
        SELECT emp_no, salary, from_date,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM employees_temp.salaries
      ),
      latest_manager AS (
        SELECT emp_no, dept_no, from_date,
               ROW_NUMBER() OVER (PARTITION BY dept_no ORDER BY from_date DESC) as rn
        FROM employees_temp.dept_manager
      )
      SELECT 
        d.dept_no, 
        d.dept_name, 
        COUNT(lde.emp_no)::int AS employee_count,
        ROUND(AVG(ls.salary))::int AS avg_salary,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        m.emp_no AS manager_emp_no
      FROM employees_temp.departments d
      LEFT JOIN latest_dept_emp lde ON d.dept_no = lde.dept_no AND lde.rn = 1
      LEFT JOIN latest_salaries ls ON lde.emp_no = ls.emp_no AND ls.rn = 1
      LEFT JOIN latest_manager lm ON d.dept_no = lm.dept_no AND lm.rn = 1
      LEFT JOIN employees_temp.employees m ON lm.emp_no = m.emp_no
      GROUP BY d.dept_no, d.dept_name, m.first_name, m.last_name, m.emp_no
      ORDER BY d.dept_name ASC
    `;

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Departments API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments data' },
      { status: 500 }
    );
  }
}
