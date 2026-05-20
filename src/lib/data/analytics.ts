import { prisma } from '@/lib/db';

export interface AnalyticsData {
  kpis: {
    totalEmployees: number;
    totalDepartments: number;
    avgSalary: number;
    totalPayroll: string;
  };
  deptDistribution: Array<{ dept_name: string; count: number }>;
  salaryDistribution: Array<{ range: string; count: number }>;
  hiringTrend: Array<{ year: number; hires: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
  topTitles: Array<{ title: string; count: number; avg_salary: number }>;
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const [kpiData, distributions, hiringTrend, genderDistribution] = await Promise.all([
    prisma.$queryRaw<{ total_employees: number; total_departments: number; avg_salary: number; total_payroll: string }[]>`
      WITH latest_salary AS (
        SELECT emp_no, salary, from_date,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM salaries
      )
      SELECT 
        (SELECT COUNT(*) FROM employees)::int AS total_employees,
        (SELECT COUNT(*) FROM departments)::int AS total_departments,
        ROUND(AVG(ls.salary))::int AS avg_salary,
        SUM(ls.salary)::bigint::text AS total_payroll
      FROM latest_salary ls WHERE ls.rn = 1
    `,

    prisma.$queryRaw<{ dept_name: string; dept_count: number; range: string; salary_range_count: number; title: string; title_count: number; avg_salary: number }[]>`
      WITH latest_dept_emp AS (
        SELECT emp_no, dept_no, from_date,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM dept_emp
      ),
      latest_salary AS (
        SELECT emp_no, salary, from_date,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM salaries
      ),
      latest_title AS (
        SELECT emp_no, title, from_date,
               ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) as rn
        FROM titles
      )
      SELECT 
        d.dept_name,
        COUNT(de.emp_no)::int AS dept_count,
        NULL::text AS range,
        0::int AS salary_range_count,
        NULL::text AS title,
        0::int AS title_count,
        0::int AS avg_salary
      FROM latest_dept_emp de
      JOIN departments d ON de.dept_no = d.dept_no AND de.rn = 1
      GROUP BY d.dept_name
      UNION ALL
      SELECT 
        NULL::text AS dept_name,
        0::int AS dept_count,
        CASE
          WHEN ls.salary < 40000 THEN '< 40K'
          WHEN ls.salary < 50000 THEN '40-50K'
          WHEN ls.salary < 60000 THEN '50-60K'
          WHEN ls.salary < 70000 THEN '60-70K'
          WHEN ls.salary < 80000 THEN '70-80K'
          WHEN ls.salary < 90000 THEN '80-90K'
          WHEN ls.salary < 100000 THEN '90-100K'
          ELSE '100K+'
        END AS range,
        COUNT(*)::int AS salary_range_count,
        NULL::text AS title,
        0::int AS title_count,
        0::int AS avg_salary
      FROM latest_salary ls WHERE ls.rn = 1
      GROUP BY range
      UNION ALL
      SELECT 
        NULL::text AS dept_name,
        0::int AS dept_count,
        NULL::text AS range,
        0::int AS salary_range_count,
        lt.title,
        COUNT(DISTINCT lt.emp_no)::int AS title_count,
        COALESCE(ROUND(AVG(ls.salary))::int, 0) AS avg_salary
      FROM latest_title lt
      LEFT JOIN latest_salary ls ON lt.emp_no = ls.emp_no AND ls.rn = 1
      WHERE lt.rn = 1
      GROUP BY lt.title
    `,

    prisma.$queryRaw<{ year: number; hires: number }[]>`
      SELECT EXTRACT(YEAR FROM hire_date)::int AS year, COUNT(*)::int AS hires
      FROM employees
      GROUP BY year
      ORDER BY year
    `,

    prisma.$queryRaw<{ gender: string; count: number }[]>`
      SELECT
        CASE WHEN gender = 'M' THEN 'Male' ELSE 'Female' END AS gender,
        COUNT(*)::int AS count
      FROM employees
      GROUP BY gender
    `
  ]);

  const deptDistribution = distributions
    .filter((d) => d.dept_name !== null)
    .map((d) => ({ dept_name: d.dept_name!, count: d.dept_count }));

  const salaryDistribution = distributions
    .filter((d) => d.range !== null)
    .sort((a, b) => {
      const order = ['< 40K', '40-50K', '50-60K', '60-70K', '70-80K', '80-90K', '90-100K', '100K+'];
      return order.indexOf(a.range!) - order.indexOf(b.range!);
    })
    .map((d) => ({ range: d.range!, count: d.salary_range_count }));

  const topTitles = distributions
    .filter((d) => d.title !== null)
    .map((d) => ({ title: d.title!, count: d.title_count, avg_salary: d.avg_salary }));

  const kpis = kpiData[0] || { total_employees: 0, total_departments: 0, avg_salary: 0, total_payroll: '0' };

  return {
    kpis: {
      totalEmployees: kpis.total_employees,
      totalDepartments: kpis.total_departments,
      avgSalary: kpis.avg_salary,
      totalPayroll: kpis.total_payroll
    },
    deptDistribution,
    salaryDistribution,
    hiringTrend,
    genderDistribution,
    topTitles,
  };
}
