import { prisma } from '@/lib/db';
import { DepartmentSummary } from '@/types';

export async function getDepartments(): Promise<DepartmentSummary[]> {
  const departments = await prisma.$queryRaw<DepartmentSummary[]>`
    WITH latest_manager AS (
      SELECT emp_no, dept_no, from_date,
             ROW_NUMBER() OVER (PARTITION BY dept_no ORDER BY from_date DESC) as rn
      FROM dept_manager
    )
    SELECT 
      d.dept_no, 
      d.dept_name, 
      COUNT(mv.emp_no)::int AS employee_count,
      ROUND(AVG(mv.current_salary))::int AS avg_salary,
      CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
      m.emp_no AS manager_emp_no
    FROM departments d
    LEFT JOIN mv_current_employees mv ON d.dept_name = mv.current_department
    LEFT JOIN latest_manager lm ON d.dept_no = lm.dept_no AND lm.rn = 1
    LEFT JOIN employees m ON lm.emp_no = m.emp_no
    GROUP BY d.dept_no, d.dept_name, m.first_name, m.last_name, m.emp_no
    ORDER BY d.dept_name ASC
  `;

  return departments;
}
