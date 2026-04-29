'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  nameKey: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-lg text-xs">
        <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
        <p className="text-foreground font-bold text-sm">{payload[0].value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

// Gradient-style dark colors matching mockup bars
const BAR_COLORS = [
  '#3d4a3d',
  '#2d3a2d',
  '#4a5a4a',
  '#3a4a3a',
  '#2a382a',
  '#5a6a5a',
];

export default function BarChart({ data, dataKey, nameKey }: BarChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
          <CartesianGrid vertical={false} stroke="#f0ede8" strokeDasharray="3 3" />
          <XAxis
            dataKey={nameKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8a8780', fontSize: 11, fontWeight: 500 }}
            angle={-40}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8a8780', fontSize: 11, fontWeight: 500 }}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
          <Bar dataKey={dataKey} radius={[8, 8, 8, 8]} maxBarSize={36}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
