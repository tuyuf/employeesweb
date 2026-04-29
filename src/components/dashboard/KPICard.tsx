import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'tan' | 'bronze' | 'brown' | 'stone' | 'amber';
  size?: 'default' | 'large';
}

const iconColorVariants = {
  tan: "text-black",
  bronze: "text-black",
  brown: "text-black",
  stone: "text-black",
  amber: "text-black",
};

const iconBgVariants = {
  tan: "bg-black/10",
  bronze: "bg-black/10",
  brown: "bg-black/10",
  stone: "bg-black/10",
  amber: "bg-black/10",
};

export default function KPICard({ title, value, subtitle, icon: Icon, variant = 'tan', size = 'default' }: KPICardProps) {
  const isLarge = size === 'large';

  return (
    <Card className={cn("p-5 hover-lift", isLarge ? "col-span-1 lg:col-span-2" : "")}>
      <div className="flex flex-col gap-3">
        <div className={cn("rounded-lg flex items-center justify-center", isLarge ? "w-12 h-12" : "w-10 h-10", iconBgVariants[variant])}>
          <Icon size={isLarge ? 24 : 20} strokeWidth={2} className={iconColorVariants[variant]} />
        </div>
        <div>
          <p className={cn("text-muted-foreground uppercase tracking-wider", isLarge ? "text-[13px]" : "text-[12px]")}>{title}</p>
          <p className={cn("font-bold", isLarge ? "text-4xl" : "text-2xl")}>{value}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}