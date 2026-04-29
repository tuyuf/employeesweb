import { prisma } from '@/lib/db';
import { formatCurrency, formatDate, getInitials, cn } from '@/lib/utils';
import {
  ArrowLeft, Users, DollarSign, UserCog, Calendar,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { DepartmentDetail, EmployeeListItem, ManagerHistoryItem, PagePagination } from '@/types';

interface EmployeeRow {
  emp_no: number;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string;
  hire_date: string;
  current_salary: number | null;
  current_title: string | null;
}

async function getDepartmentData(id: string, page: number = 1): Promise<DepartmentDetail | null> {
  const department = await prisma.department.findUnique({
    where: { dept_no: id },
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

  if (!department) return null;

  const stats = await prisma.$queryRawUnsafe<[{ employee_count: number; avg_salary: number }]>(
    `
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
    WHERE de.dept_no = $1 AND de.to_date = '9999-01-01'::date
    `,
    id
  );

  const { employee_count, avg_salary } = stats[0];
  const size = 20;
  const totalPages = Math.max(1, Math.ceil(employee_count / size));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * size;

  const rows = await prisma.$queryRawUnsafe<EmployeeRow[]>(
    `
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
    WHERE de.dept_no = $1 AND de.to_date = '9999-01-01'::date
    ORDER BY e.hire_date ASC, e.emp_no ASC
    OFFSET ${offset}
    LIMIT ${size}
    `,
    id
  );

  const employees: EmployeeListItem[] = rows.map(r => ({
    emp_no: r.emp_no,
    first_name: r.first_name,
    last_name: r.last_name,
    gender: r.gender as 'M' | 'F',
    birth_date: r.birth_date,
    hire_date: r.hire_date,
    current_salary: r.current_salary ?? undefined,
    current_title: r.current_title ?? undefined,
  }));

  const currentManagerRecord = department.dept_managers.find(
    m => m.to_date.getFullYear() === 9999
  );

  const managers: ManagerHistoryItem[] = department.dept_managers.map(dm => ({
    emp_no: dm.employee.emp_no,
    first_name: dm.employee.first_name,
    last_name: dm.employee.last_name,
    from_date: dm.from_date.toISOString(),
    to_date: dm.to_date.toISOString(),
  }));

  const pagination: PagePagination = {
    page: currentPage,
    pageSize: size,
    totalPages,
    totalItems: employee_count,
  };

  return {
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
    pagination,
  };
}

function PaginationBar({
  deptNo,
  currentPage,
  totalPages,
}: {
  deptNo: string;
  currentPage: number;
  totalPages: number;
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

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {currentPage > 1 ? (
        <Link
          href={`/departments/${deptNo}?page=${currentPage - 1}`}
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
            href={`/departments/${deptNo}?page=${p}`}
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
          href={`/departments/${deptNo}?page=${currentPage + 1}`}
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

export default async function DepartmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || '1'));
  const department = await getDepartmentData(id, currentPage);

  if (!department) {
    return (
      <div className="space-y-4">
        <Link
          href="/departments"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "h-8 px-2 text-xs text-muted-foreground")}
        >
          <ArrowLeft size={13} className="mr-1" />Departments
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm font-medium">Department not found</p>
          <p className="text-xs text-muted-foreground mt-1">This department may not exist in the database.</p>
        </div>
      </div>
    );
  }

  const page = department.pagination.page;

  return (
    <div className="space-y-5">
      <Link
        href="/departments"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "h-8 px-2 text-xs text-muted-foreground -ml-2")}
      >
        <ArrowLeft size={13} className="mr-1" />Departments
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="rounded-sm text-[11px] font-mono mb-2">
            {department.dept_no}
          </Badge>
          <h2 className="text-xl font-serif font-semibold tracking-tight">
            {department.dept_name}
          </h2>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-md">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users size={14} />
              <p className="text-xs font-medium">Headcount</p>
            </div>
            <p className="text-xl font-semibold font-mono">{department.employee_count.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign size={14} />
              <p className="text-xs font-medium">Average Salary</p>
            </div>
            <p className="text-xl font-semibold font-mono">{formatCurrency(department.avg_salary)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Current Manager */}
        <Card className="rounded-md">
          <CardHeader className="px-5 py-4 border-b border-border">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {department.current_manager ? (
              <Link
                href={`/employees/${department.current_manager.emp_no}`}
                className="flex items-center gap-3 group"
              >
                <Avatar className="h-10 w-10 rounded-md shrink-0">
                  <AvatarFallback className="rounded-md bg-foreground text-background text-xs font-semibold">
                    {getInitials(department.current_manager.first_name, department.current_manager.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold group-hover:underline underline-offset-2 decoration-muted-foreground/30 truncate">
                    {department.current_manager.first_name} {department.current_manager.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">#{department.current_manager.emp_no}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <UserCog size={16} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No current manager</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manager count */}
        <Card className="rounded-md">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar size={14} />
              <p className="text-xs font-medium">Total Managers</p>
            </div>
            <p className="text-xl font-semibold font-mono">{department.managers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Manager History */}
      <Card className="rounded-md">
        <CardHeader className="px-5 py-4 border-b border-border">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Manager History ({department.managers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {department.managers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No records found.</p>
          ) : (
            <ol className="relative border-l-2 border-border ml-2 space-y-5">
              {department.managers.map((m, i) => {
                const isCurrent = new Date(m.to_date).getFullYear() === 9999;
                return (
                  <li key={i} className="ml-5">
                    <div className={cn(
                      "absolute w-3 h-3 rounded-full -left-[18.5px] top-0.5 border-2 border-white",
                      isCurrent ? "bg-green-500" : "bg-foreground"
                    )} />
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                      <div>
                        <Link
                          href={`/employees/${m.emp_no}`}
                          className="text-sm font-semibold hover:underline underline-offset-2 decoration-muted-foreground/30"
                        >
                          {m.first_name} {m.last_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">#{m.emp_no}</p>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(m.from_date)} —{' '}
                          {isCurrent ? 'Present' : formatDate(m.to_date)}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Employee list */}
      <Card className="rounded-md">
        <CardHeader className="px-5 py-4 border-b border-border">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Employees ({department.employee_count.toLocaleString()})
            <span className="font-normal lowercase ml-1">
              · page {page} of {department.pagination.totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {department.employees.length === 0 ? (
            <p className="text-xs text-muted-foreground p-5">No employees in this department.</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {department.employees.map((emp) => (
                  <Link
                    key={emp.emp_no}
                    href={`/employees/${emp.emp_no}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors gap-1 sm:gap-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground font-mono shrink-0">#{emp.emp_no}</span>
                      <span className="text-sm font-medium truncate">
                        {emp.first_name} {emp.last_name}
                      </span>
                      {emp.current_title && (
                        <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                          {emp.current_title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-7 sm:ml-0">
                      {emp.current_salary && (
                        <span className="text-xs font-mono text-muted-foreground">{formatCurrency(emp.current_salary)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Hired {formatDate(emp.hire_date)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="border-t border-border">
                <PaginationBar
                  deptNo={department.dept_no}
                  currentPage={page}
                  totalPages={department.pagination.totalPages}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
