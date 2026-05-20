import { prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';

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

/**
 * Optimized analytics data using materialized view
 * Eliminates repeated CTEs across the employees table
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  // Execute all queries in parallel
  const [kpiData, deptDistribution, salaryDistribution, topTitles, hiringTrend, genderDistribution] = await Promise.all([
    // KPIs - optimized using materialized view
    prisma.$queryRaw<{
      total_employees: number;
      total_departments: number;
      avg_salary: number;
      total_payroll: string;
    }[]>`
      SELECT 
        (SELECT COUNT(*) FROM mv_current_employees)::int AS total_employees,
        (SELECT COUNT(*) FROM departments)::int AS total_departments,
        ROUND(AVG(current_salary))::int AS avg_salary,
        COALESCE(SUM(current_salary), 0)::bigint::text AS total_payroll
      FROM mv_current_employees
      WHERE current_salary IS NOT NULL
    `,

    // Department distribution - from materialized view
    prisma.$queryRaw<{ dept_name: string; count: number }[]>`
      SELECT 
        current_department AS dept_name,
        COUNT(*)::int AS count
      FROM mv_current_employees
      WHERE current_department IS NOT NULL
      GROUP BY current_department
      ORDER BY count DESC
    `,

    // Salary distribution - from materialized view (pre-computed salary_range)
    prisma.$queryRaw<{ range: string; count: number }[]>`
      SELECT 
        salary_range AS range,
        COUNT(*)::int AS count
      FROM mv_current_employees
      WHERE salary_range IS NOT NULL
      GROUP BY salary_range
      ORDER BY 
        CASE salary_range
          WHEN '< 40K' THEN 1
          WHEN '40-50K' THEN 2
          WHEN '50-60K' THEN 3
          WHEN '60-70K' THEN 4
          WHEN '70-80K' THEN 5
          WHEN '80-90K' THEN 6
          WHEN '90-100K' THEN 7
          WHEN '100K+' THEN 8
          ELSE 9
        END
    `,

    // Top titles - from materialized view
    prisma.$queryRaw<{ title: string; count: number; avg_salary: number }[]>`
      SELECT 
        current_title AS title,
        COUNT(*)::int AS count,
        ROUND(AVG(current_salary))::int AS avg_salary
      FROM mv_current_employees
      WHERE current_title IS NOT NULL AND current_salary IS NOT NULL
      GROUP BY current_title
      ORDER BY count DESC
    `,

    // Hiring trend - from original employees table (hire_date)
    prisma.$queryRaw<{ year: number; hires: number }[]>`
      SELECT 
        EXTRACT(YEAR FROM hire_date)::int AS year, 
        COUNT(*)::int AS hires
      FROM employees
      GROUP BY year
      ORDER BY year
    `,

    // Gender distribution - from materialized view
    prisma.$queryRaw<{ gender: string; count: number }[]>`
      SELECT
        CASE WHEN gender = 'M' THEN 'Male' ELSE 'Female' END AS gender,
        COUNT(*)::int AS count
      FROM mv_current_employees
      GROUP BY gender
    `
  ]);

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

/**
 * Cached version for dashboard (refreshes every 60 seconds)
 */
export const getCachedAnalyticsData = unstable_cache(
  async () => getAnalyticsData(),
  ['analytics-data'],
  {
    revalidate: 60,
    tags: ['analytics', 'employees'],
  }
);

/**
 * Refresh materialized view (call this when data changes)
 */
export async function refreshMaterializedView(): Promise<void> {
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_employees`;
}
