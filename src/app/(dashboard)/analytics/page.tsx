import ChartCard from '@/components/dashboard/ChartCard';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import PieChart from '@/components/charts/PieChart';
import { formatCurrency } from '@/lib/utils';
import { getAnalyticsData } from '@/lib/data/analytics-optimized';

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">Failed to load analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Analytics</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Compensation and workforce insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top Titles by Headcount">
          <BarChart data={data.topTitles.slice(0, 10)} nameKey="title" dataKey="count" />
        </ChartCard>

        <ChartCard title="Top Titles by Average Salary">
          <BarChart
            data={[...data.topTitles].sort((a: { avg_salary: number }, b: { avg_salary: number }) => b.avg_salary - a.avg_salary).slice(0, 10)}
            nameKey="title"
            dataKey="avg_salary"
          />
        </ChartCard>

        <ChartCard title="Hiring Trend by Year">
          <LineChart data={data.hiringTrend} nameKey="year" dataKey="hires" />
        </ChartCard>

        <ChartCard title="Salary Distribution">
          <PieChart data={data.salaryDistribution} nameKey="range" dataKey="count" />
        </ChartCard>
      </div>

      {/* Compensation table */}
      <div>
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Title Compensation Breakdown
        </h3>
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {/* Header row */}
            <div className="grid grid-cols-3 px-6 py-3 bg-muted/30">
              <span className="text-[12px] font-semibold text-muted-foreground">Position</span>
              <span className="text-[12px] font-semibold text-muted-foreground text-right">Headcount</span>
              <span className="text-[12px] font-semibold text-muted-foreground text-right">Avg Salary</span>
            </div>
            {data.topTitles.map((title: { title: string; count: number; avg_salary: number }, idx: number) => (
              <div key={idx} className="grid grid-cols-3 px-6 py-3 hover:bg-muted/20 transition-colors">
                <span className="text-[13px] font-medium">{title.title}</span>
                <span className="text-[13px] font-mono text-right text-muted-foreground">{title.count.toLocaleString()}</span>
                <span className="text-[13px] font-mono text-right font-medium">{formatCurrency(title.avg_salary)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
