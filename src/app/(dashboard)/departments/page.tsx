import { DepartmentSummary } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Users, DollarSign, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

async function getDepartments() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${appUrl}/api/departments`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json() as Promise<DepartmentSummary[]>;
  } catch {
    return [];
  }
}

export default async function DepartmentsPage() {
  const departments = await getDepartments();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Departments</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          {departments.length} departments · company structure
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div key={dept.dept_no} className="bg-white border border-border rounded-2xl flex flex-col overflow-hidden hover-lift transition-all">
             <Link href={`/departments/${dept.dept_no}`} className="px-5 py-4 border-b border-border block hover:bg-muted/20 transition-colors">
              <p className="text-[11px] text-muted-foreground font-mono">{dept.dept_no}</p>
              <h3 className="text-[14px] font-semibold tracking-tight mt-0.5">{dept.dept_name}</h3>
            </Link>
            <div className="px-5 py-4 flex-1 space-y-3">
              <StatRow icon={Users} label="Headcount" value={dept.employee_count.toLocaleString()} />
              <StatRow icon={DollarSign} label="Avg Salary" value={formatCurrency(dept.avg_salary)} />
              <StatRow icon={UserCog} label="Manager" value={dept.manager_name ?? '—'} />

              <div className="pt-2">
                <Link
                  href={`/departments/${dept.dept_no}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "w-full h-9 text-[12px] rounded-xl border-border")}
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <p className="col-span-full text-[13px] text-muted-foreground">
            Failed to load departments.
          </p>
        )}
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size: number }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={13} />
        <span className="text-[12px]">{label}</span>
      </div>
      <span className="text-[12px] font-semibold text-foreground">{value}</span>
    </div>
  );
}