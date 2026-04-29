'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PieChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  nameKey: string;
}

const COLORS = ['#2d3a2d', '#4a5a4a', '#6b7a6b', '#8a9a8a', '#a5b5a5', '#c0d0c0'];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-lg text-xs">
        <p className="font-semibold text-muted-foreground mb-0.5">{payload[0].name}</p>
        <p className="text-foreground font-bold text-sm">{payload[0].value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function PieChart({ data, dataKey, nameKey }: PieChartProps) {
  return (
    <div className="h-[260px] w-full flex items-center justify-around gap-4">
      <div className="flex-1 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={95}
              innerRadius={70}
              dataKey={dataKey}
              nameKey={nameKey}
              strokeWidth={3}
              stroke="#ffffff"
              paddingAngle={3}
              cornerRadius={8}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <ul className="shrink-0 space-y-2.5 pr-4">
        {data.map((entry, index) => (
          <li key={index} className="flex items-center gap-2.5 text-[12px] font-medium text-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span>{String(entry[nameKey])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
