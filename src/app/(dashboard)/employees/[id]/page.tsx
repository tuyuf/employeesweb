import { prisma } from '@/lib/db';
import { formatCurrency, formatDate, calculateYearsOfService, getInitials, cn } from '@/lib/utils';
import { EmployeeDetail } from '@/types';
import { ArrowLeft, Calendar, Briefcase, Building2, DollarSign, Cake, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { buttonVariants } from '@/components/ui/button';

async function getEmployeeData(id: string): Promise<EmployeeDetail | null> {
  try {
    const empNo = parseInt(id);
    if (isNaN(empNo)) return null;

    const employee = await prisma.employee.findUnique({
      where: { emp_no: empNo },
      select: {
        emp_no: true,
        first_name: true,
        last_name: true,
        gender: true,
        birth_date: true,
        hire_date: true,
        dept_emps: {
          select: {
            dept_no: true,
            from_date: true,
            to_date: true,
            department: { select: { dept_name: true } },
          },
          orderBy: { from_date: 'desc' },
        },
        titles: {
          select: { title: true, from_date: true, to_date: true },
          orderBy: { from_date: 'desc' },
        },
        salaries: {
          select: { salary: true, from_date: true, to_date: true },
          orderBy: { from_date: 'desc' },
          take: 10,
        },
        dept_managers: {
          select: {
            dept_no: true,
            from_date: true,
            to_date: true,
            department: { select: { dept_name: true } },
          },
          orderBy: { from_date: 'desc' },
        },
      },
    });

    if (!employee) return null;

    let currentManager: { emp_no: number; first_name: string; last_name: string } | undefined;
    const currentDeptNo = employee.dept_emps[0]?.dept_no;
    if (currentDeptNo) {
      const managerRecord = await prisma.deptManager.findFirst({
        where: { dept_no: currentDeptNo, to_date: new Date('9999-01-01') },
        select: { employee: { select: { emp_no: true, first_name: true, last_name: true } } },
        orderBy: { from_date: 'desc' },
      });
      if (managerRecord) {
        currentManager = {
          emp_no: managerRecord.employee.emp_no,
          first_name: managerRecord.employee.first_name,
          last_name: managerRecord.employee.last_name,
        };
      }
    }

    return {
      emp_no: employee.emp_no,
      first_name: employee.first_name,
      last_name: employee.last_name,
      gender: employee.gender,
      birth_date: employee.birth_date.toISOString(),
      hire_date: employee.hire_date.toISOString(),
      current_department: employee.dept_emps[0]?.department.dept_name,
      current_title: employee.titles[0]?.title,
      current_salary: employee.salaries[0]?.salary,
      departments: employee.dept_emps.map(de => ({
        dept_no: de.dept_no,
        dept_name: de.department.dept_name,
        from_date: de.from_date.toISOString(),
        to_date: de.to_date.toISOString(),
      })),
      titles: employee.titles.map(t => ({
        title: t.title,
        from_date: t.from_date.toISOString(),
        to_date: t.to_date?.toISOString() ?? null,
      })),
      salaries: employee.salaries.map(s => ({
        salary: s.salary,
        from_date: s.from_date.toISOString(),
        to_date: s.to_date.toISOString(),
      })),
      managers: employee.dept_managers.map(dm => ({
        dept_no: dm.dept_no,
        dept_name: dm.department.dept_name,
        from_date: dm.from_date.toISOString(),
        to_date: dm.to_date.toISOString(),
      })),
      currentManager,
    };
  } catch {
    return null;
  }
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployeeData(id);

  if (!employee) {
    return (
      <div className="space-y-4">
        <Link
          href="/employees"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "h-8 px-2 text-xs text-muted-foreground")}
        >
          <ArrowLeft size={13} className="mr-1" />Back
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm font-medium">Employee #{id} not found</p>
          <p className="text-xs text-muted-foreground mt-1">This record may not exist in the database.</p>
        </div>
      </div>
    );
  }

  const yearsOfService = calculateYearsOfService(employee.hire_date);

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/employees"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "h-8 px-2 text-xs text-muted-foreground -ml-2")}
      >
        <ArrowLeft size={13} className="mr-1" />Employees
      </Link>

      {/* Profile Card */}
      <Card className="rounded-md">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-14 w-14 rounded-md shrink-0">
              <AvatarFallback className="rounded-md bg-foreground text-background text-base font-semibold tracking-tight">
                {getInitials(employee.first_name, employee.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-serif font-semibold tracking-tight">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {employee.current_title ?? 'No title'} · #{employee.emp_no}
                  </p>
                </div>
                {employee.current_department && (
                  <Badge variant="secondary" className="rounded-sm text-xs font-medium shrink-0">
                    {employee.current_department}
                  </Badge>
                )}
              </div>

              {employee.currentManager && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
                  <UserCheck size={14} />
                  <span>Reports to <span className="font-medium text-foreground">{employee.currentManager.first_name} {employee.currentManager.last_name}</span> · #{employee.currentManager.emp_no}</span>
                </div>
              )}

              <Separator className="my-4" />

              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatItem
                  icon={DollarSign}
                  label="Current Salary"
                  value={employee.current_salary ? formatCurrency(employee.current_salary) : '—'}
                />
                <StatItem
                  icon={Calendar}
                  label="Hired"
                  value={formatDate(employee.hire_date)}
                />
                <StatItem
                  icon={Briefcase}
                  label="Tenure"
                  value={`${yearsOfService} yr${yearsOfService !== 1 ? 's' : ''}`}
                />
                <StatItem
                  icon={Building2}
                  label="Gender"
                  value={employee.gender === 'M' ? 'Male' : 'Female'}
                />
                <StatItem
                  icon={Cake}
                  label="Birth Date"
                  value={formatDate(employee.birth_date)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Title history */}
        <Card className="rounded-md">
          <CardHeader className="px-5 py-4 border-b border-border">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Position History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {employee.titles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No records found.</p>
            ) : (
              <ol className="relative border-l-2 border-border ml-2 space-y-5">
                {employee.titles.map((t, i) => (
                  <li key={i} className="ml-5">
                    <div className="absolute w-3 h-3 bg-foreground rounded-full -left-[18.5px] top-0.5 border-2 border-white" />
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(t.from_date)} —{' '}
                      {t.to_date && new Date(t.to_date).getFullYear() !== 9999
                        ? formatDate(t.to_date)
                        : 'Present'}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Salary history */}
        <Card className="rounded-md">
          <CardHeader className="px-5 py-4 border-b border-border">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Salary History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {employee.salaries.length === 0 ? (
              <p className="text-xs text-muted-foreground p-5">No records found.</p>
            ) : (
              <ul className="divide-y divide-border">
                {employee.salaries.map((s, i) => (
                  <li key={i} className={`flex items-center justify-between px-5 py-3 ${i === 0 ? 'bg-muted/20' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{formatCurrency(s.salary)}</span>
                      {i === 0 && (
                        <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Current</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.from_date)} —{' '}
                      {s.to_date && new Date(s.to_date).getFullYear() !== 9999
                        ? formatDate(s.to_date)
                        : 'Present'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Department history */}
        <Card className="rounded-md">
          <CardHeader className="px-5 py-4 border-b border-border">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Department History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {employee.departments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No records found.</p>
            ) : (
              <ol className="relative border-l-2 border-border ml-2 space-y-5">
                {employee.departments.map((d, i) => (
                  <li key={i} className="ml-5">
                    <div className="absolute w-3 h-3 bg-foreground rounded-full -left-[18.5px] top-0.5 border-2 border-white" />
                    <p className="text-sm font-medium">{d.dept_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(d.from_date)} —{' '}
                      {d.to_date && new Date(d.to_date).getFullYear() !== 9999
                        ? formatDate(d.to_date)
                        : 'Present'}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Manager history */}
        <Card className="rounded-md">
          <CardHeader className="px-5 py-4 border-b border-border">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Manager History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {employee.managers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No records found.</p>
            ) : (
              <ul className="divide-y divide-border">
                {employee.managers.map((m, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{m.dept_name}</p>
                      <p className="text-xs text-muted-foreground">Dept #{m.dept_no}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDate(m.from_date)} —{' '}
                      {m.to_date && new Date(m.to_date).getFullYear() !== 9999
                        ? formatDate(m.to_date)
                        : 'Present'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ size: number }>; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon size={12} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
