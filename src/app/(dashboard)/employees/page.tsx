import { prisma } from '@/lib/db';
import EmployeeTable from '@/components/employees/EmployeeTable';
import EmployeeFilters from '@/components/employees/EmployeeFilters';
import { EmployeeListItem } from '@/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

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

function escapeSearchInput(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

async function getEmployees(searchParams: { page?: string; size?: string; search?: string; department?: string }) {
  const size = Math.min(parseInt(searchParams.size || '20'), 100);
  const search = searchParams.search || '';
  const department = searchParams.department || '';
  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const offset = (page - 1) * size;

  const escapedSearch = escapeSearchInput(search);

  const searchCondition = escapedSearch
    ? `AND (e.first_name ILIKE '%' || $1 || '%' OR e.last_name ILIKE '%' || $1 || '%' OR e.emp_no::text LIKE $1 || '%')`
    : '';

  const deptCondition = department
    ? `AND d.dept_name = $${escapedSearch ? 2 : 1}`
    : '';

  const deptExistsCondition = department
    ? `AND EXISTS (SELECT 1 FROM dept_emp de JOIN departments d2 ON d2.dept_no = de.dept_no WHERE de.emp_no = e.emp_no AND de.to_date = '9999-01-01'::date AND d2.dept_name = $${escapedSearch ? 2 : 1})`
    : '';

  const baseParams: (string | null)[] = [];
  if (escapedSearch) baseParams.push(escapedSearch);
  if (department) baseParams.push(department);

  const countResult = await prisma.$queryRawUnsafe<[{ count: number }]>(
    `
    SELECT COUNT(*)::int AS count
    FROM employees e
    WHERE 1=1 ${searchCondition} ${deptExistsCondition}
    `,
    ...baseParams
  );

  const total = countResult[0]?.count || 0;

  const employees = await prisma.$queryRawUnsafe<EmployeeRow[]>(
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
    WHERE 1=1 ${searchCondition} ${deptCondition}
    ORDER BY e.hire_date ASC, e.emp_no ASC
    LIMIT ${size} OFFSET ${offset}
    `,
    ...baseParams
  );

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

  const totalPages = Math.max(1, Math.ceil(total / size));

  return {
    data,
    pagination: {
      page,
      pageSize: size,
      totalPages,
      totalItems: total,
    },
  };
}

function PaginationBar({
  currentPage,
  totalPages,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  searchParams: { search?: string; department?: string };
}) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const buildHref = (page: number) => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    if (searchParams.search) sp.set('search', searchParams.search);
    if (searchParams.department) sp.set('department', searchParams.department);
    return `?${sp.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            "h-8 w-8 p-0 rounded-md border-border"
          )}
        >
          <ChevronLeft size={14} />
        </Link>
      ) : (
        <span className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground cursor-not-allowed">
          <ChevronLeft size={14} />
        </span>
      )}

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="h-8 w-5 inline-flex items-center justify-center text-xs text-muted-foreground">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={cn(
              buttonVariants({ variant: p === currentPage ? 'default' : 'outline', size: 'sm' }),
              "h-8 min-w-8 px-2 rounded-md",
              p === currentPage
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "border-border"
            )}
          >
            <span className="text-xs font-medium">{p}</span>
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            "h-8 w-8 p-0 rounded-md border-border"
          )}
        >
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground cursor-not-allowed">
          <ChevronRight size={14} />
        </span>
      )}
    </div>
  );
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; search?: string; department?: string }>;
}) {
  const params = await searchParams;
  const result = await getEmployees(params);
  const { data: employees, pagination } = result;

  const hasActiveFilters = params.search || params.department;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Employees</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {employees.length > 0
              ? `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.totalItems} total`
              : 'Browse employees'}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilters />

      {/* Table */}
      <EmployeeTable employees={employees} />

      {/* Pagination */}
      {employees.length > 0 && pagination.totalPages > 1 && (
        <PaginationBar
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          searchParams={params}
        />
      )}
    </div>
  );
}
