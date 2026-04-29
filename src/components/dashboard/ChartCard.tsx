interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden animate-fade-in-up">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}