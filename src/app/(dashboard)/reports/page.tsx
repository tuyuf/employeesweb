import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import ManagerFilters from '@/components/reports/ManagerFilters';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { getManagerReports, getManagerDepartments } from '@/lib/data/manager-reports';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; department?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { data: managers, executionTimeMs, totalCount, totalPages, currentManagersCount, page } = await getManagerReports(params);
  const departments = await getManagerDepartments();

  const size = Math.min(parseInt(params.size || '20'), 100);
  const hasActiveFilters = params.department || params.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Manager Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {managers.length > 0
              ? `Page ${page} of ${totalPages} · ${totalCount} total`
              : 'Browse manager history'}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <ManagerFilters departments={departments} />

      {/* Performance Metrics Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Managers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From vw_manager_profiles view
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-black text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Query Execution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{executionTimeMs}ms</div>
            <p className="text-xs text-white/70 mt-1">
              Performance metric for grading
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Managers
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Active
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {currentManagersCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently managing departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Managers Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Manager Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Employee ID</TableHead>
                <TableHead className="text-muted-foreground font-medium">Manager Name</TableHead>
                <TableHead className="text-muted-foreground font-medium">Department</TableHead>
                <TableHead className="text-muted-foreground font-medium">Tenure Start</TableHead>
                <TableHead className="text-muted-foreground font-medium">Tenure End</TableHead>
                <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Tenure Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((manager) => (
                <TableRow key={`${manager.manager_emp_no}-${manager.dept_no}`} className="border-b border-border">
                  <TableCell className="font-mono text-sm">{manager.manager_emp_no}</TableCell>
                  <TableCell className="font-medium">{manager.manager_full_name}</TableCell>
                  <TableCell>{manager.department_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {manager.tenure_start_date}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {manager.tenure_end_date === '9999-01-01' ? 'Present' : manager.tenure_end_date}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={manager.manager_status === 'Current' ? 'default' : 'secondary'}
                      className={
                        manager.manager_status === 'Current'
                          ? 'bg-black text-white hover:bg-black'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {manager.manager_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {manager.tenure_days !== null
                      ? `${manager.tenure_days.toLocaleString()} days`
                      : 'Active'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {managers.length > 0 && totalPages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          searchParams={{ department: params.department, status: params.status }}
          basePath="/reports"
        />
      )}

      {/* Data Source Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
        <div>
          <span className="font-medium">Data Source:</span> vw_manager_profiles (SQL View)
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Execution Time:</span>
          <span className="font-mono bg-black text-white px-2 py-0.5 rounded">{executionTimeMs}ms</span>
        </div>
      </div>
    </div>
  );
}
