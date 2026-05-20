import KPICard from '@/components/dashboard/KPICard';
import ChartCard from '@/components/dashboard/ChartCard';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import { Users, Building2, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getCachedAnalyticsData } from '@/lib/data/analytics-optimized';

export default async function DashboardPage() {
  const data = await getCachedAnalyticsData();

  const kpis = data.kpis;
  const deptData = data.deptDistribution.map((d) => ({
    department: d.dept_name,
    employees: d.count,
  }));
  const genderData = data.genderDistribution;
  
  // Calculate total for gender percentages
  const totalGender = genderData.reduce((sum, g) => sum + g.count, 0);
  const maleCount = genderData.find((g) => g.gender === 'Male')?.count || 0;
  const femaleCount = genderData.find((g) => g.gender === 'Female')?.count || 0;
  const malePercent = totalGender > 0 ? Math.round((maleCount / totalGender) * 100) : 0;
  const femalePercent = totalGender > 0 ? Math.round((femaleCount / totalGender) * 100) : 0;

  // Find largest department
  const largestDept = deptData.length > 0 
    ? deptData.reduce((max, d) => d.employees > max.employees ? d : max)
    : null;

  return (
    <div className="space-y-6">
      {/* KPI Cards - 4 metrics with Total Payroll as large */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Payroll"
          value={formatCurrency(parseInt(kpis.totalPayroll))}
          subtitle="Annual total"
          icon={TrendingUp}
          variant="tan"
          size="large"
        />
        <KPICard
          title="Total Employees"
          value={formatNumber(kpis.totalEmployees)}
          subtitle="All in system"
          icon={Users}
          variant="bronze"
        />
        <KPICard
          title="Departments"
          value={formatNumber(kpis.totalDepartments)}
          subtitle="Active"
          icon={Building2}
          variant="brown"
        />
      </div>

      {/* Important Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Distribution - Vertical Bar */}
        <ChartCard title="Employee Distribution by Department">
          <BarChart 
            data={deptData} 
            nameKey="department" 
            dataKey="employees" 
          />
          {largestDept && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Largest department: <span className="font-semibold text-foreground">{largestDept.department}</span> with{' '}
                <span className="font-semibold text-foreground">{formatNumber(largestDept.employees)}</span> employees
              </p>
            </div>
          )}
        </ChartCard>

        {/* Gender Distribution - Donut */}
        <ChartCard title="Gender Distribution">
          <PieChart 
            data={genderData} 
            nameKey="gender" 
            dataKey="count" 
          />
          <div className="mt-4 pt-4 border-t border-border flex justify-between">
            <div className="text-center">
              <p className="text-2xl font-bold">{malePercent}%</p>
              <p className="text-xs text-muted-foreground">Male</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{femalePercent}%</p>
              <p className="text-xs text-muted-foreground">Female</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(totalGender)}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
