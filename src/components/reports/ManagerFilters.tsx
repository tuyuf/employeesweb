'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ManagerFiltersProps {
  departments: string[];
}

export default function ManagerFilters({ departments }: ManagerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialDepartment = searchParams.get('department') || '';
  const initialStatus = searchParams.get('status') || '';

  const [department, setDepartment] = useState(initialDepartment);
  const [status, setStatus] = useState(initialStatus);

  // Update URL when filters change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL();
    }, 300);
    return () => clearTimeout(timer);
  }, [department, status]);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();

    if (department) {
      params.set('department', department);
    }

    if (status) {
      params.set('status', status);
    }

    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  }, [department, status, pathname, router]);

  const clearFilters = () => {
    setDepartment('');
    setStatus('');
    router.push(pathname);
  };

  const hasFilters = department || status;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Department filter */}
      <div className="relative sm:w-[240px]">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full h-11 appearance-none bg-background border border-input rounded-xl px-5 pr-10 text-[14px] font-medium text-foreground focus:bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Status filter */}
      <div className="relative sm:w-[180px]">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full h-11 appearance-none bg-background border border-input rounded-xl px-5 pr-10 text-[14px] font-medium text-foreground focus:bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="Current">Current</option>
          <option value="Former">Former</option>
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Clear button */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="h-11 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      )}
    </div>
  );
}
