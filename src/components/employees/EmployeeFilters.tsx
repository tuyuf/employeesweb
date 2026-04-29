'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DEPARTMENTS = [
  'Customer Service',
  'Development',
  'Finance',
  'Human Resources',
  'Marketing',
  'Production',
  'Quality Management',
  'Research',
  'Sales',
];

export default function EmployeeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (search !== currentSearch) {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const dept = searchParams.get('department') || '';
        if (dept) params.set('department', dept);
        const query = params.toString();
        router.push(`${pathname}${query ? `?${query}` : ''}`);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, pathname, router, searchParams]);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDepartment(val);
    const params = new URLSearchParams();
    const currentSearch = searchParams.get('search') || '';
    if (currentSearch) params.set('search', currentSearch);
    if (val) params.set('department', val);
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    router.push(pathname);
  };

  const hasFilters = search || department;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1 group">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find employees..."
          className="pl-12 h-11 bg-background border border-input rounded-xl focus:bg-background focus:border-primary transition-all text-[14px] font-medium placeholder:text-muted-foreground"
        />
      </div>

      {/* Department filter */}
      <div className="relative sm:w-[240px]">
        <select
          value={department}
          onChange={handleDeptChange}
          className="w-full h-11 appearance-none bg-background border border-input rounded-xl px-5 pr-10 text-[14px] font-medium text-foreground focus:bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {hasFilters && (
        <Button 
          variant="ghost" 
          onClick={clearFilters} 
          className="h-11 px-5 rounded-xl text-[12px] font-medium hover:bg-accent/10 hover:text-accent transition-all"
        >
          <X size={14} className="mr-2" /> Reset
        </Button>
      )}
    </div>
  );
}