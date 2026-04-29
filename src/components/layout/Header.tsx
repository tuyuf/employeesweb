'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/departments': 'Departments',
  '/analytics': 'Analytics',
};

export default function Header() {
  const pathname = usePathname();
  const currentTitle = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] ?? 'Dashboard';

  return (
    <header className="flex items-center justify-between px-8 py-5 sticky top-0 z-30 bg-white border-b border-border">
      <h1 className="text-[26px] font-semibold tracking-tight text-foreground">
        {currentTitle}
      </h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-[200px] bg-white border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
          />
        </div>

        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-border hover:bg-muted/40 transition-colors">
          <Bell size={16} className="text-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-black rounded-full" />
        </button>

        <Avatar className="h-9 w-9 border-2 border-border cursor-pointer hover:border-muted-foreground transition-colors">
          <AvatarImage src="" alt="User" />
          <AvatarFallback className="text-[11px] font-semibold bg-black text-white">
            AR
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}