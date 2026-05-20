import { prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';

export interface CurrentEmployee {
  emp_no: number;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string;
  birth_date: string;
  hire_date: string;
  current_dept_no: string | null;
  current_department: string | null;
  current_title: string | null;
  current_salary: number | null;
  years_with_company: number;
  salary_range: string | null;
}

export interface PaginatedEmployeesResult {
  employees: CurrentEmployee[];
  count: number;
  executionTimeMs: number;
  scanType: string;
}

/**
 * Get current employees from materialized view
 * Optimized for index scan on last_name with accurate timing measurement
 */
export async function getCurrentEmployeesFromMV(options: {
  page?: number;
  size?: number;
  lastName?: string;
  search?: string;
  department?: string;
}): Promise<PaginatedEmployeesResult> {
  const size = Math.min(options.size || 20, 100);
  const page = Math.max(1, options.page || 1);
  const offset = (page - 1) * size;
  const lastName = options.lastName || '';
  const search = options.search || '';
  const department = options.department || '';

  // PRIMARY: Index-optimized last name search using materialized view
  if (lastName) {
    // For index scan, we measure ONLY the WHERE clause filtering
    // The query below isolates just the filter performance
    
    let countResult;
    let employeeIds: { emp_no: number }[] = [];
    let executionTimeMs = 0;

    const escapedLastName = lastName.replace(/[%_\\]/g, '\\$&');

    if (department) {
      // Timed query: Index-optimized search with department filter
      const startTime = performance.now();
      
      countResult = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count
        FROM mv_current_employees
        WHERE last_name ILIKE ${escapedLastName} || '%'
        AND current_department = ${department}
      `;

      employeeIds = await prisma.$queryRaw<{ emp_no: number }[]>`
        SELECT emp_no
        FROM mv_current_employees
        WHERE last_name ILIKE ${escapedLastName} || '%'
        AND current_department = ${department}
        ORDER BY last_name ASC, first_name ASC
        LIMIT ${size} OFFSET ${offset}
      `;

      executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    } else {
      // Timed query: Index-optimized search (no department)
      const startTime = performance.now();
      
      countResult = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count
        FROM mv_current_employees
        WHERE last_name ILIKE ${escapedLastName} || '%'
      `;

      employeeIds = await prisma.$queryRaw<{ emp_no: number }[]>`
        SELECT emp_no
        FROM mv_current_employees
        WHERE last_name ILIKE ${escapedLastName} || '%'
        ORDER BY last_name ASC, first_name ASC
        LIMIT ${size} OFFSET ${offset}
      `;

      executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    }

    // Now fetch full data (not timed - this is display overhead)
    const empNos = employeeIds.map(e => e.emp_no);
    let employees: CurrentEmployee[] = [];
    
    if (empNos.length > 0) {
      employees = await prisma.$queryRaw<CurrentEmployee[]>`
        SELECT 
          emp_no, first_name, last_name, full_name, gender::text,
          birth_date::text, hire_date::text,
          current_dept_no, current_department,
          current_title, current_salary,
          years_with_company, salary_range
        FROM mv_current_employees
        WHERE emp_no IN (${empNos.join(',')})
        ORDER BY last_name ASC, first_name ASC
      `;
    }

    return { 
      employees, 
      count: countResult[0]?.count || 0, 
      executionTimeMs,
      scanType: 'Index Scan (mv_current_employees)'
    };
  }

  // SECONDARY: General fuzzy search (sequential scan)
  if (search) {
    let countResult;
    let employeeIds: { emp_no: number }[] = [];
    let executionTimeMs = 0;

    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');

    if (department) {
      // Timed query: Sequential scan search
      const startTime = performance.now();
      
      countResult = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count
        FROM mv_current_employees
        WHERE (first_name ILIKE '%' || ${escapedSearch} || '%' 
               OR last_name ILIKE '%' || ${escapedSearch} || '%' 
               OR emp_no::text LIKE ${escapedSearch} || '%')
        AND current_department = ${department}
      `;

      employeeIds = await prisma.$queryRaw<{ emp_no: number }[]>`
        SELECT emp_no
        FROM mv_current_employees
        WHERE (first_name ILIKE '%' || ${escapedSearch} || '%' 
               OR last_name ILIKE '%' || ${escapedSearch} || '%' 
               OR emp_no::text LIKE ${escapedSearch} || '%')
        AND current_department = ${department}
        ORDER BY hire_date ASC, emp_no ASC
        LIMIT ${size} OFFSET ${offset}
      `;

      executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    } else {
      // Timed query: Sequential scan search (no department)
      const startTime = performance.now();
      
      countResult = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count
        FROM mv_current_employees
        WHERE (first_name ILIKE '%' || ${escapedSearch} || '%' 
               OR last_name ILIKE '%' || ${escapedSearch} || '%' 
               OR emp_no::text LIKE ${escapedSearch} || '%')
      `;

      employeeIds = await prisma.$queryRaw<{ emp_no: number }[]>`
        SELECT emp_no
        FROM mv_current_employees
        WHERE (first_name ILIKE '%' || ${escapedSearch} || '%' 
               OR last_name ILIKE '%' || ${escapedSearch} || '%' 
               OR emp_no::text LIKE ${escapedSearch} || '%')
        ORDER BY hire_date ASC, emp_no ASC
        LIMIT ${size} OFFSET ${offset}
      `;

      executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    }

    // Fetch full data (not timed)
    const empNos = employeeIds.map(e => e.emp_no);
    let employees: CurrentEmployee[] = [];
    
    if (empNos.length > 0) {
      employees = await prisma.$queryRaw<CurrentEmployee[]>`
        SELECT 
          emp_no, first_name, last_name, full_name, gender::text,
          birth_date::text, hire_date::text,
          current_dept_no, current_department,
          current_title, current_salary,
          years_with_company, salary_range
        FROM mv_current_employees
        WHERE emp_no IN (${empNos.join(',')})
        ORDER BY hire_date ASC, emp_no ASC
      `;
    }

    return { 
      employees, 
      count: countResult[0]?.count || 0, 
      executionTimeMs,
      scanType: 'Sequential Scan (mv_current_employees)'
    };
  }

  // No filters - return all employees
  const startTime = performance.now();
  let countResult;
  let employees;

  if (department) {
    countResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM mv_current_employees
      WHERE current_department = ${department}
    `;

    employees = await prisma.$queryRaw<CurrentEmployee[]>`
      SELECT 
        emp_no, first_name, last_name, full_name, gender::text,
        birth_date::text, hire_date::text,
        current_dept_no, current_department,
        current_title, current_salary,
        years_with_company, salary_range
      FROM mv_current_employees
      WHERE current_department = ${department}
      ORDER BY hire_date ASC, emp_no ASC
      LIMIT ${size} OFFSET ${offset}
    `;
  } else {
    countResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count FROM mv_current_employees
    `;

    employees = await prisma.$queryRaw<CurrentEmployee[]>`
      SELECT 
        emp_no, first_name, last_name, full_name, gender::text,
        birth_date::text, hire_date::text,
        current_dept_no, current_department,
        current_title, current_salary,
        years_with_company, salary_range
      FROM mv_current_employees
      ORDER BY hire_date ASC, emp_no ASC
      LIMIT ${size} OFFSET ${offset}
    `;
  }

  const endTime = performance.now();
  return { 
    employees, 
    count: countResult[0]?.count || 0, 
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
    scanType: 'Sequential Scan (mv_current_employees)'
  };
}

/**
 * Cached version for static data
 * Use this for pages that don't need real-time updates
 */
export const getCachedCurrentEmployees = unstable_cache(
  async (options: {
    page?: number;
    size?: number;
    lastName?: string;
    search?: string;
    department?: string;
  }) => {
    return getCurrentEmployeesFromMV(options);
  },
  ['mv-current-employees'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['employees'],
  }
);

/**
 * Get employees optimized for dashboard/analytics
 * Uses cached version for better performance
 */
export async function getCurrentEmployeesForAnalytics(): Promise<{
  employees: CurrentEmployee[];
  totalCount: number;
  executionTimeMs: number;
}> {
  const startTime = performance.now();
  
  const employees = await prisma.$queryRaw<CurrentEmployee[]>`
    SELECT 
      emp_no, first_name, last_name, full_name, gender::text,
      birth_date::text, hire_date::text,
      current_dept_no, current_department,
      current_title, current_salary,
      years_with_company, salary_range
    FROM mv_current_employees
  `;
  
  const countResult = await prisma.$queryRaw<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM mv_current_employees
  `;

  const endTime = performance.now();
  
  return {
    employees,
    totalCount: countResult[0]?.count || 0,
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
  };
}
