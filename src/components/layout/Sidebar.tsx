'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  History,
  FileText,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size: number; strokeWidth?: number }>;
}

export default function Sidebar() {
  const pathname = usePathname();

  const mainNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/departments', label: 'Departments', icon: Building2 },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/history', label: 'History', icon: History },
    { href: '/reports', label: 'Manager Reports', icon: FileText },
    { href: '/performance', label: 'Performance Analysis', icon: Zap },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] z-40 flex flex-col bg-white border-r border-border/40 animate-slide-in-left">
      {/* Brand */}
      <div className="flex items-center px-6 h-[72px] shrink-0">
        <Link href="/dashboard" className="flex items-center">
          <span
            className="text-2xl tracking-tight"
            style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 700 }}
          >
            EmployeesWeb
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150',
                isActive
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}