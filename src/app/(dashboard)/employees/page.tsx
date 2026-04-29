import EmployeeTable from '@/components/employees/EmployeeTable';
import EmployeeFilters from '@/components/employees/EmployeeFilters';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserPlus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

async function getEmployees(searchParams: { cursor?: string; size?: string; search?: string; department?: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`${appUrl}/api/employees`);

  const cursor = searchParams.cursor || '';
  const size = searchParams.size || '20';
  const search = searchParams.search || '';
  const department = searchParams.department || '';

  if (cursor) url.searchParams.set('cursor', cursor);
  url.searchParams.set('size', size);
  if (search) url.searchParams.set('search', search);
  if (department) url.searchParams.set('department', department);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return { data: [], pagination: { nextCursor: null, hasMore: false, pageSize: 20 } };
    return res.json();
  } catch {
    return { data: [], pagination: { nextCursor: null, hasMore: false, pageSize: 20 } };
  }
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; size?: string; search?: string; department?: string }>;
}) {
  const params = await searchParams;
  const result = await getEmployees(params);
  const { data: employees, pagination } = result;

  const buildLoadMoreHref = (nextCursor: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('cursor', nextCursor);
    if (params.search) searchParams.set('search', params.search);
    if (params.department) searchParams.set('department', params.department);
    return `?${searchParams.toString()}`;
  };

  const hasActiveFilters = params.search || params.department;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Employees</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {employees.length > 0 ? `${employees.length} records loaded` : 'Browse employees'}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-[13px] font-medium rounded-xl hover:bg-black/80 transition-colors">
          <UserPlus size={14} />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <EmployeeFilters />

      {/* Table */}
      <EmployeeTable employees={employees} />

      {/* Load More / Reset */}
      {employees.length > 0 && (
        <div className="flex items-center justify-center pt-2">
          {pagination.hasMore ? (
            <Link
              href={buildLoadMoreHref(pagination.nextCursor!)}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                "h-10 px-6 text-[13px] gap-2 rounded-xl border-border"
              )}
            >
              Load More <RefreshCw size={14} />
            </Link>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              End of results
            </p>
          )}
        </div>
      )}
    </div>
  );
}