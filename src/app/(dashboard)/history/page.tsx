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
import { PaginationBar } from '@/components/ui/pagination-bar';

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

  const [countResult] = await prisma.$queryRaw<[{ total: number }]>`
    SELECT (
      (SELECT COUNT(*) FROM titles) +
      (SELECT COUNT(*) FROM salaries) +
      (SELECT COUNT(*) FROM dept_emp) +
      (SELECT COUNT(*) FROM dept_manager)
    )::int AS total
  `;
  const total = countResult?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages);
  const currentOffset = (currentPage - 1) * size;

  const rows = await prisma.$queryRaw<HistoryRow[]>`
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
  `;

  return { rows, total, totalPages, page: currentPage };
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
          basePath="/history"
        />
      )}
    </div>
  );
}
