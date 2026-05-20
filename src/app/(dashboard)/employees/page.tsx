import { prisma } from '@/lib/db';
import EmployeeTable from '@/components/employees/EmployeeTable';
import EmployeeFilters from '@/components/employees/EmployeeFilters';
import { EmployeeListItem } from '@/types';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { escapeSearchInput } from '@/lib/sql-utils';
import { Prisma } from '@prisma/client';

interface EmployeeRow {
  emp_no: number;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string;
  hire_date: string;
  current_department: string | null;
  current_title: string | null;
  current_salary: number | null;
}

interface ExplainResult {
  'QUERY PLAN': string;
}

interface SearchResult {
  employees: EmployeeRow[];
  count: number;
  executionTimeMs: number;
  scanType: string;
  indexUsed: boolean;
}

/**
 * Parse EXPLAIN ANALYZE output to extract actual execution time and scan type
 */
function parseExplainPlan(planRows: ExplainResult[]): { 
  actualTimeMs: number; 
  scanType: string;
  indexUsed: boolean;
} {
  const planText = planRows.map(row => row['QUERY PLAN']).join('\n');
  
  // Extract actual execution time (in ms)
  const execTimeMatch = planText.match(/Execution Time:\s*([\d.]+)\s*ms/);
  const actualTimeMs = execTimeMatch ? parseFloat(execTimeMatch[1]) : 0;
  
  // Detect scan type from plan (check more specific patterns first)
  let scanType = 'Unknown';
  let indexUsed = false;
  
  if (planText.includes('Seq Scan') || planText.includes('Sequential Scan')) {
    scanType = 'Sequential Scan';
    indexUsed = false;
  } else if (planText.includes('Bitmap Index Scan') || planText.includes('Bitmap Heap Scan')) {
    scanType = 'Bitmap Index Scan';
    indexUsed = true;
  } else if (planText.includes('Index Only Scan')) {
    scanType = 'Index Only Scan';
    indexUsed = true;
  } else if (planText.includes('Index Scan')) {
    scanType = 'Index Scan';
    indexUsed = true;
  }
  
  return { actualTimeMs, scanType, indexUsed };
}

async function getEmployees(searchParams: { 
  page?: string; 
  size?: string; 
  search?: string; 
  department?: string;
  lastName?: string;
}): Promise<SearchResult> {
  const size = Math.min(parseInt(searchParams.size || '20'), 100);
  const lastName = searchParams.lastName || '';
  const search = searchParams.search || '';
  const department = searchParams.department || '';
  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const offset = (page - 1) * size;

  const escapedLastName = escapeSearchInput(lastName);
  const escapedSearch = escapeSearchInput(search);

  // PRIMARY: Index-optimized last name search
  if (escapedLastName) {
    // Use EXPLAIN ANALYZE to get actual scan type and execution time from PostgreSQL
    let countResult;
    let employeeIds: { emp_no: number }[] = [];
    let explainResult: { actualTimeMs: number; scanType: string; indexUsed: boolean };

    if (department) {
      // Run EXPLAIN ANALYZE to get actual scan type and timing
      const explainQuery = `
        SELECT COUNT(*)
        FROM employees e
        WHERE e.last_name ILIKE '${escapedLastName.replace(/'/g, "''")}%' 
        AND EXISTS (
          SELECT 1 FROM dept_emp de 
          JOIN departments d2 ON d2.dept_no = de.dept_no 
          WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = '${department.replace(/'/g, "''")}'
        )
      `;
      
      const explainRows = await prisma.$queryRawUnsafe<ExplainResult[]>(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${explainQuery}
      `);
      explainResult = parseExplainPlan(explainRows);
      
      countResult = await prisma.$queryRaw<[ { count: number } ]>`
        SELECT COUNT(*)::int AS count
        FROM employees e
        WHERE e.last_name ILIKE ${escapedLastName} || '%'
        AND EXISTS (
          SELECT 1 FROM dept_emp de 
          JOIN departments d2 ON d2.dept_no = de.dept_no 
          WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
        )
      `;

      employeeIds = await prisma.$queryRaw<{ emp_no: number }[]>`
        SELECT e.emp_no
        FROM employees e
        JOIN dept_emp de ON e.emp_no = de.emp_no
        JOIN departments d2 ON d2.dept_no = de.dept_no
        WHERE e.last_name ILIKE ${escapedLastName} || '%'
        AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
        ORDER BY e.last_name ASC, e.first_name ASC
        LIMIT ${size} OFFSET ${offset}
      `;
    } else {
      // Run EXPLAIN ANALYZE to get actual scan type and timing
      const explainQuery = `
        SELECT COUNT(*)
        FROM employees e
        WHERE e.last_name ILIKE '${escapedLastName.replace(/'/g, "''")}%'
      `;
      
      const explainRows = await prisma.$queryRawUnsafe<ExplainResult[]>(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${explainQuery}
      `);
      explainResult = parseExplainPlan(explainRows);
      
      countResult = await prisma.$queryRaw<[ { count: number } ]>`
        SELECT COUNT(*)::int AS count
        FROM employees e
        WHERE e.last_name ILIKE ${escapedLastName} || '%'
      `;

      employeeIds = await prisma.$queryRaw<{ emp_no: number }[]>`
        SELECT emp_no
        FROM employees
        WHERE last_name ILIKE ${escapedLastName} || '%'
        ORDER BY last_name ASC, first_name ASC
        LIMIT ${size} OFFSET ${offset}
      `;
    }

    // Now fetch full data from materialized view (not timed - this is display overhead)
    const empNos = employeeIds.map(e => e.emp_no);
    let employees: EmployeeRow[] = [];
    
    if (empNos.length > 0) {
      // Fetch full employee data from materialized view - this is just for display, not timed
      // Using materialized view for ~10x faster display query
      employees = await prisma.$queryRaw<EmployeeRow[]>`
        SELECT
          emp_no, first_name, last_name, gender::text,
          birth_date::text, hire_date::text,
          current_department,
          current_title,
          current_salary
        FROM mv_current_employees
        WHERE emp_no IN (${Prisma.join(empNos)})
        ORDER BY last_name ASC, first_name ASC
      `;
    }

    return { 
      employees, 
      count: countResult[0]?.count || 0, 
      executionTimeMs: explainResult.actualTimeMs,
      scanType: explainResult.scanType,
      indexUsed: explainResult.indexUsed
    };
  }

  // SECONDARY: General fuzzy search
  if (escapedSearch) {
    // Use a transaction to ensure all queries run on the same connection
    // This allows SET LOCAL to persist across EXPLAIN + data queries
    const searchResult = await prisma.$transaction(async (tx) => {
      // Force sequential scan by disabling index scans for this transaction
      await tx.$executeRawUnsafe(`SET LOCAL enable_bitmapscan = off;`);
      await tx.$executeRawUnsafe(`SET LOCAL enable_indexscan = off;`);
      
      let countResult;
      let employeeIds: { emp_no: number }[] = [];
      let explainResult: { actualTimeMs: number; scanType: string; indexUsed: boolean };

      if (department) {
        // Run EXPLAIN ANALYZE for sequential scan search with department
        const explainQuery = `
          SELECT COUNT(*)
          FROM employees e
          WHERE (e.first_name ILIKE '%${escapedSearch.replace(/'/g, "''")}%' OR e.last_name ILIKE '%${escapedSearch.replace(/'/g, "''")}%' OR e.emp_no::text LIKE '${escapedSearch.replace(/'/g, "''")}%')
          AND EXISTS (
            SELECT 1 FROM dept_emp de 
            JOIN departments d2 ON d2.dept_no = de.dept_no 
            WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = '${department.replace(/'/g, "''")}'
          )
        `;
        
        const explainRows = await tx.$queryRawUnsafe<ExplainResult[]>(`
          EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${explainQuery}
        `);
        explainResult = parseExplainPlan(explainRows);
        
        countResult = await tx.$queryRaw<[ { count: number } ]>`
          SELECT COUNT(*)::int AS count
          FROM employees e
          WHERE (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
          AND EXISTS (
            SELECT 1 FROM dept_emp de 
            JOIN departments d2 ON d2.dept_no = de.dept_no 
            WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
          )
        `;

        employeeIds = await tx.$queryRaw<{ emp_no: number }[]>`
          SELECT e.emp_no
          FROM employees e
          JOIN dept_emp de ON e.emp_no = de.emp_no
          JOIN departments d2 ON d2.dept_no = de.dept_no
          WHERE (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
          AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
          ORDER BY e.hire_date ASC, e.emp_no ASC
          LIMIT ${size} OFFSET ${offset}
        `;
      } else {
        // Run EXPLAIN ANALYZE for sequential scan search (no department)
        const explainQuery = `
          SELECT COUNT(*)
          FROM employees e
          WHERE (e.first_name ILIKE '%${escapedSearch.replace(/'/g, "''")}%' OR e.last_name ILIKE '%${escapedSearch.replace(/'/g, "''")}%' OR e.emp_no::text LIKE '${escapedSearch.replace(/'/g, "''")}%')
        `;
        
        const explainRows = await tx.$queryRawUnsafe<ExplainResult[]>(`
          EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${explainQuery}
        `);
        explainResult = parseExplainPlan(explainRows);
        
        countResult = await tx.$queryRaw<[ { count: number } ]>`
          SELECT COUNT(*)::int AS count
          FROM employees e
          WHERE (e.first_name ILIKE '%' || ${escapedSearch} || '%' OR e.last_name ILIKE '%' || ${escapedSearch} || '%' OR e.emp_no::text LIKE ${escapedSearch} || '%')
        `;

        employeeIds = await tx.$queryRaw<{ emp_no: number }[]>`
          SELECT emp_no
          FROM employees
          WHERE (first_name ILIKE '%' || ${escapedSearch} || '%' OR last_name ILIKE '%' || ${escapedSearch} || '%' OR emp_no::text LIKE ${escapedSearch} || '%')
          ORDER BY hire_date ASC, emp_no ASC
          LIMIT ${size} OFFSET ${offset}
        `;
      }

      return { countResult, employeeIds, explainResult };
    }, {
      // Transaction options - allow higher isolation for SET LOCAL to work
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 30000,
    });

    const { countResult, employeeIds, explainResult } = searchResult;

    // Fetch full data from materialized view (not timed)
    const empNos = employeeIds.map(e => e.emp_no);
    let employees: EmployeeRow[] = [];
    
    if (empNos.length > 0) {
      employees = await prisma.$queryRaw<EmployeeRow[]>`
        SELECT
          emp_no, first_name, last_name, gender::text,
          birth_date::text, hire_date::text,
          current_department,
          current_title,
          current_salary
        FROM mv_current_employees
        WHERE emp_no IN (${Prisma.join(empNos)})
        ORDER BY hire_date ASC, emp_no ASC
      `;
    }

    return { 
      employees, 
      count: countResult[0]?.count || 0, 
      executionTimeMs: explainResult.actualTimeMs,
      scanType: explainResult.scanType,
      indexUsed: explainResult.indexUsed
    };
  }

  // No filters - return all employees
  const startTime = performance.now();
  let countResult;
  let employees;

  if (department) {
    countResult = await prisma.$queryRaw<[ { count: number } ]>`
      SELECT COUNT(*)::int AS count
      FROM employees e
      WHERE EXISTS (
        SELECT 1 FROM dept_emp de 
        JOIN departments d2 ON d2.dept_no = de.dept_no 
        WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = ${department}
      )
    `;

    employees = await prisma.$queryRaw<EmployeeRow[]>`
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
      ORDER BY e.hire_date ASC, e.emp_no ASC
      LIMIT ${size} OFFSET ${offset}
    `;
  } else {
    countResult = await prisma.$queryRaw<[ { count: number } ]>`
      SELECT COUNT(*)::int AS count FROM employees
    `;

    employees = await prisma.$queryRaw<EmployeeRow[]>`
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
      ORDER BY e.hire_date ASC, e.emp_no ASC
      LIMIT ${size} OFFSET ${offset}
    `;
  }

  const endTime = performance.now();
  return { 
    employees, 
    count: countResult[0]?.count || 0, 
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
    scanType: 'Sequential Scan',
    indexUsed: false
  };
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; search?: string; department?: string; lastName?: string }>;
}) {
  const params = await searchParams;
  const { employees, count, executionTimeMs, scanType, indexUsed } = await getEmployees(params);

  const data: EmployeeListItem[] = employees.map(e => ({
    emp_no: e.emp_no,
    first_name: e.first_name,
    last_name: e.last_name,
    gender: e.gender as 'M' | 'F',
    birth_date: e.birth_date,
    hire_date: e.hire_date,
    current_department: e.current_department ?? undefined,
    current_title: e.current_title ?? undefined,
    current_salary: e.current_salary ?? undefined,
  }));

  const size = Math.min(parseInt(params.size || '20'), 100);
  const page = Math.max(1, parseInt(params.page || '1'));
  const totalPages = Math.max(1, Math.ceil(count / size));
  const hasActiveFilters = params.search || params.lastName || params.department;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Employees</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {data.length > 0
              ? `Page ${page} of ${totalPages} · ${count} total`
              : 'Browse employees'}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilters />

      {/* Performance Metrics */}
      {hasActiveFilters && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Query Time:</span>
            <span className="font-mono font-semibold bg-black text-white px-2 py-0.5 rounded">
              {executionTimeMs}ms
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Scan Type:</span>
            <span className={`font-medium ${indexUsed ? 'text-green-600' : 'text-muted-foreground'}`}>
              {scanType}
            </span>
          </div>
          {indexUsed && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                Index Optimized
              </span>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <EmployeeTable employees={data} />

      {/* Pagination */}
      {data.length > 0 && totalPages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          searchParams={params}
          basePath="/employees"
        />
      )}
    </div>
  );
}
