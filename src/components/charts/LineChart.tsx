'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  nameKey: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-lg text-xs">
        <p className="font-semibold text-muted-foreground mb-0.5">Year {label}</p>
        <p className="text-foreground font-bold text-sm">{payload[0].value?.toLocaleString()} hires</p>
      </div>
    );
  }
  return null;
};

export default function LineChart({ data, dataKey, nameKey }: LineChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
          <defs>
            <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3a4a3a" stopOpacity={0.12}/>
              <stop offset="95%" stopColor="#3a4a3a" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f0ede8" strokeDasharray="3 3" />
          <XAxis
            dataKey={nameKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8a8780', fontSize: 11, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8a8780', fontSize: 11, fontWeight: 500 }}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#3a4a3a"
            strokeWidth={2.5}
            dot={{ r: 0 }}
            activeDot={{ r: 5, fill: '#3a4a3a', strokeWidth: 2, stroke: '#fff' }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}