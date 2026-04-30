import { prisma } from '@/lib/db';
import { formatDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import Link from 'next/link';

interface HistoryRow {
  emp_no: number;
  first_name: string;
  last_name: string;
  from_date: string;
  value: string;
  change_type: string;
  dept_name: string | null;
}

const CHANGE_TYPE_STYLES: Record<string, string> = {
  'Title Change': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'Salary Change': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'Department Change': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'Manager Appointment': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
};

async function getHistoryData(page: number = 1) {
  const size = 20;

  const [countResult] = await prisma.$queryRawUnsafe<[{ total: number }]>(
    `SELECT (
      (SELECT COUNT(*) FROM titles) +
      (SELECT COUNT(*) FROM salaries) +
      (SELECT COUNT(*) FROM dept_emp) +
      (SELECT COUNT(*) FROM dept_manager)
    )::int AS total`
  );
  const total = countResult?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages);
  const currentOffset = (currentPage - 1) * size;

  const rows = await prisma.$queryRawUnsafe<HistoryRow[]>(
    `
    SELECT emp_no, first_name, last_name, from_date, value, change_type, dept_name FROM (
      SELECT e.emp_no, e.first_name, e.last_name, t.from_date::text,
             t.title AS value, 'Title Change' AS change_type,
             d.dept_name
      FROM titles t
      JOIN employees e ON e.emp_no = t.emp_no
      LEFT JOIN dept_emp de ON de.emp_no = t.emp_no AND de.to_date = '9999-01-01'::date
      LEFT JOIN departments d ON d.dept_no = de.dept_no
      ORDER BY t.from_date DESC
      LIMIT 500
    ) t
    UNION ALL
    SELECT emp_no, first_name, last_name, from_date, value, change_type, dept_name FROM (
      SELECT e.emp_no, e.first_name, e.last_name, s.from_date::text,
             s.salary::text AS value, 'Salary Change' AS change_type,
             d.dept_name
      FROM salaries s
      JOIN employees e ON e.emp_no = s.emp_no
      LEFT JOIN dept_emp de ON de.emp_no = s.emp_no AND de.to_date = '9999-01-01'::date
      LEFT JOIN departments d ON d.dept_no = de.dept_no
      ORDER BY s.from_date DESC
      LIMIT 500
    ) s
    UNION ALL
    SELECT emp_no, first_name, last_name, from_date, value, change_type, dept_name FROM (
      SELECT e.emp_no, e.first_name, e.last_name, de.from_date::text,
             d.dept_name AS value, 'Department Change' AS change_type,
             d.dept_name
      FROM dept_emp de
      JOIN employees e ON e.emp_no = de.emp_no
      JOIN departments d ON d.dept_no = de.dept_no
      ORDER BY de.from_date DESC
      LIMIT 500
    ) de
    UNION ALL
    SELECT emp_no, first_name, last_name, from_date, value, change_type, dept_name FROM (
      SELECT e.emp_no, e.first_name, e.last_name, dm.from_date::text,
             d.dept_name AS value, 'Manager Appointment' AS change_type,
             d.dept_name
      FROM dept_manager dm
      JOIN employees e ON e.emp_no = dm.emp_no
      JOIN departments d ON d.dept_no = dm.dept_no
      ORDER BY dm.from_date DESC
      LIMIT 500
    ) dm
    ORDER BY from_date DESC
    LIMIT ${size} OFFSET ${currentOffset}
    `,
  );

  return { rows, total, totalPages, page: currentPage };
}

function PaginationBar({
  currentPage,
  totalPages,
}: {
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
          href={`/history?page=${currentPage - 1}`}
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
            href={`/history?page=${p}`}
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
          href={`/history?page=${currentPage + 1}`}
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

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || '1'));
  const { rows, total, totalPages, page } = await getHistoryData(currentPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Clock size={20} className="text-muted-foreground" />
            History
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {rows.length > 0
              ? `Page ${page} of ${totalPages} · ${total.toLocaleString()} total changes`
              : 'Organizational changes'}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden animate-fade-in-up">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="h-14 pl-8 text-[12px] uppercase tracking-wide text-muted-foreground">Date</TableHead>
              <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground">Employee</TableHead>
              <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground">Type</TableHead>
              <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground">Value</TableHead>
              <TableHead className="h-14 pr-8 text-[12px] uppercase tracking-wide text-muted-foreground">Department</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={`${row.change_type}-${row.emp_no}-${row.from_date}-${i}`} className="hover:bg-transparent transition-all duration-150 border-b border-border last:border-0">
                <TableCell className="pl-8 py-4 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                  {formatDate(row.from_date)}
                </TableCell>
                <TableCell className="py-4">
                  <Link
                    href={`/employees/${row.emp_no}`}
                    className="text-[13px] font-medium text-foreground hover:underline"
                  >
                    {row.first_name} {row.last_name}
                  </Link>
                  <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                    #{row.emp_no}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium",
                    CHANGE_TYPE_STYLES[row.change_type] || 'bg-muted text-muted-foreground'
                  )}>
                    {row.change_type}
                  </span>
                </TableCell>
                <TableCell className="py-4 text-[13px] text-foreground font-medium">
                  {row.change_type === 'Salary Change'
                    ? `$${parseInt(row.value).toLocaleString()}`
                    : row.value}
                </TableCell>
                <TableCell className="py-4 pr-8">
                  {row.dept_name ? (
                    <Badge variant="secondary" className="px-3 py-1 h-6 text-[11px] uppercase tracking-wider rounded-full">
                      {row.dept_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic text-[11px]">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {rows.length > 0 && totalPages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
