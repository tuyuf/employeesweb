'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Search, X, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

type SearchMode = 'lastName' | 'general';

export default function EmployeeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine initial search mode based on URL params
  const initialLastName = searchParams.get('lastName') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialDepartment = searchParams.get('department') || '';
  const [searchMode, setSearchMode] = useState<SearchMode>(
    initialLastName ? 'lastName' : 'general'
  );

  // Search inputs
  const [lastName, setLastName] = useState(initialLastName);
  const [generalSearch, setGeneralSearch] = useState(initialSearch);
  const [department, setDepartment] = useState(initialDepartment);

  // Update URL when inputs change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL();
    }, 300);
    return () => clearTimeout(timer);
  }, [lastName, generalSearch, department, searchMode]);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();

    // Add active search based on mode
    if (searchMode === 'lastName' && lastName.trim()) {
      params.set('lastName', lastName.trim());
    } else if (searchMode === 'general' && generalSearch.trim()) {
      params.set('search', generalSearch.trim());
    }

    // Add department if selected
    if (department) {
      params.set('department', department);
    }

    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  }, [lastName, generalSearch, department, searchMode, pathname, router]);

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    // Clear the other search field when switching modes
    if (mode === 'lastName') {
      setGeneralSearch('');
    } else {
      setLastName('');
    }
  };

  const clearFilters = () => {
    setLastName('');
    setGeneralSearch('');
    setDepartment('');
    router.push(pathname);
  };

  const hasFilters = lastName || generalSearch || department;

  return (
    <div className="space-y-4">
      {/* Search Mode Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleModeChange('lastName')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            searchMode === 'lastName'
              ? 'bg-black text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Last Name (Index)</span>
          </div>
        </button>
        <button
          onClick={() => handleModeChange('general')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            searchMode === 'general'
              ? 'bg-black text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>General Search</span>
          </div>
        </button>

        {hasFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="h-9 px-3 rounded-xl text-sm font-medium hover:bg-accent/10 hover:text-accent transition-all ml-auto"
          >
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Primary: Last Name Search (Index Optimized) */}
        {searchMode === 'lastName' && (
          <div className="relative flex-1 group">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
            />
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Search by last name (e.g., Baba, Smith)..."
              className="pl-12 h-11 bg-background border border-input rounded-xl focus:bg-background focus:border-primary transition-all text-[14px] font-medium placeholder:text-muted-foreground"
            />
            {lastName && (
              <Badge
                variant="outline"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-50 text-green-700 border-green-200 text-xs"
              >
                <Zap className="h-3 w-3 mr-1" />
                Index
              </Badge>
            )}
          </div>
        )}

        {/* Secondary: General Fuzzy Search */}
        {searchMode === 'general' && (
          <div className="relative flex-1 group">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
            />
            <Input
              value={generalSearch}
              onChange={(e) => setGeneralSearch(e.target.value)}
              placeholder="Search name or employee ID..."
              className="pl-12 h-11 bg-background border border-input rounded-xl focus:bg-background focus:border-primary transition-all text-[14px] font-medium placeholder:text-muted-foreground"
            />
            {generalSearch && (
              <Badge
                variant="outline"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-muted text-muted-foreground text-xs"
              >
                Fuzzy
              </Badge>
            )}
          </div>
        )}

        {/* Department filter */}
        <div className="relative sm:w-[240px]">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full h-11 appearance-none bg-background border border-input rounded-xl px-5 pr-10 text-[14px] font-medium text-foreground focus:bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
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
      </div>

      {/* Helper text */}
      <div className="text-xs text-muted-foreground">
        {searchMode === 'lastName' ? (
          <span>
            Uses <span className="font-mono bg-muted px-1 rounded">last_name ILIKE 'prefix%'</span> with
            B-tree index for optimal performance.
          </span>
        ) : (
          <span>
            Searches across first name, last name, and employee ID using substring matching.
          </span>
        )}
      </div>
    </div>
  );
}
