import { prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';

export interface ManagerProfile {
  manager_emp_no: number;
  manager_first_name: string;
  manager_last_name: string;
  manager_full_name: string;
  dept_no: string;
  department_name: string;
  tenure_start_date: string;
  tenure_end_date: string;
  manager_status: string;
  tenure_days: number | null;
}

interface QueryResult {
  manager_emp_no: number;
  manager_first_name: string;
  manager_last_name: string;
  manager_full_name: string;
  dept_no: string;
  department_name: string;
  tenure_start_date: Date;
  tenure_end_date: Date;
  manager_status: string;
  tenure_days: number | null;
}

export interface ReportsResponse {
  data: ManagerProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  executionTimeMs: number;
  currentManagersCount: number;
}

export async function getManagerReports(searchParams: { 
  page?: string; 
  size?: string; 
  department?: string; 
  status?: string;
}): Promise<ReportsResponse> {
  const startTime = performance.now();

  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const size = Math.min(parseInt(searchParams.size || '20'), 100);
  const department = searchParams.department || '';
  const status = searchParams.status || '';
  const offset = (page - 1) * size;

  // Build WHERE conditions
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (department) {
    conditions.push('department_name = $' + (params.length + 1));
    params.push(department);
  }

  if (status) {
    conditions.push('manager_status = $' + (params.length + 1));
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build COUNT query
  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM vw_manager_profiles
    ${whereClause}
  `;

  // Build main query with pagination
  const mainQuery = `
    SELECT
      manager_emp_no,
      manager_first_name,
      manager_last_name,
      manager_full_name,
      dept_no,
      department_name,
      tenure_start_date,
      tenure_end_date,
      manager_status,
      tenure_days
    FROM vw_manager_profiles
    ${whereClause}
    ORDER BY department_name, tenure_start_date DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  // Execute count query
  const countResult = await prisma.$queryRawUnsafe<[{ count: number }]>(
    countQuery,
    ...params
  );

  // Execute main query with pagination params
  const managers = await prisma.$queryRawUnsafe<QueryResult[]>(
    mainQuery,
    ...params,
    size,
    offset
  );

  // Transform dates to strings for JSON serialization
  const formattedManagers: ManagerProfile[] = managers.map((m) => ({
    manager_emp_no: m.manager_emp_no,
    manager_first_name: m.manager_first_name,
    manager_last_name: m.manager_last_name,
    manager_full_name: m.manager_full_name,
    dept_no: m.dept_no,
    department_name: m.department_name,
    tenure_start_date: m.tenure_start_date.toISOString().split('T')[0],
    tenure_end_date: m.tenure_end_date.toISOString().split('T')[0],
    manager_status: m.manager_status,
    tenure_days: m.tenure_days,
  }));

  const totalCount = countResult[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / size);

  // Get current managers count (for the metrics card)
  let currentManagersCount = 0;
  if (!status || status === 'Current') {
    const currentConditions = [...conditions];
    const currentParams = [...params];
    
    if (status !== 'Current') {
      currentConditions.push('manager_status = $' + (currentParams.length + 1));
      currentParams.push('Current');
    }
    
    const currentWhereClause = currentConditions.length > 0 ? `WHERE ${currentConditions.join(' AND ')}` : '';
    const currentCountResult = await prisma.$queryRawUnsafe<[{ count: number }]>(`
      SELECT COUNT(*)::int AS count
      FROM vw_manager_profiles
      ${currentWhereClause}
    `, ...currentParams);
    currentManagersCount = currentCountResult[0]?.count || 0;
  }

  const endTime = performance.now();
  const executionTimeMs = Number((endTime - startTime).toFixed(2));

  return {
    data: formattedManagers,
    totalCount,
    page,
    pageSize: size,
    totalPages,
    executionTimeMs,
    currentManagersCount,
  };
}

/**
 * Get distinct departments from manager view
 */
export async function getManagerDepartments(): Promise<string[]> {
  const result = await prisma.$queryRawUnsafe<{ department_name: string }[]>(`
    SELECT DISTINCT department_name
    FROM vw_manager_profiles
    ORDER BY department_name ASC
  `);
  return result.map(r => r.department_name);
}

/**
 * Cached version for manager reports
 */
export const getCachedManagerReports = unstable_cache(
  async (searchParams: { 
    page?: string; 
    size?: string; 
    department?: string; 
    status?: string;
  }) => {
    return getManagerReports(searchParams);
  },
  ['manager-reports'],
  {
    revalidate: 60,
    tags: ['managers'],
  }
);
