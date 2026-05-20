'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  searchParams?: { search?: string; department?: string; status?: string };
  basePath: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  searchParams = {},
  basePath,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const buildHref = (pageNum: number) => {
    const sp = new URLSearchParams();
    sp.set('page', String(pageNum));
    if (searchParams.search) sp.set('search', searchParams.search);
    if (searchParams.department) sp.set('department', searchParams.department);
    if (searchParams.status) sp.set('status', searchParams.status);
    const query = sp.toString();
    return `${basePath}${query ? `?${query}` : ''}`;
  };

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            "h-8 w-8 p-0 rounded-md border-border"
          )}
        >
          <ChevronLeft size={14} />
        </Link>
      ) : (
        <span className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground cursor-not-allowed">
          <ChevronLeft size={14} />
        </span>
      )}

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="h-8 w-5 inline-flex items-center justify-center text-xs text-muted-foreground">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={cn(
              buttonVariants({ variant: p === currentPage ? 'default' : 'outline', size: 'sm' }),
              "h-8 min-w-8 px-2 rounded-md",
              p === currentPage
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "border-border"
            )}
          >
            <span className="text-xs font-medium">{p}</span>
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            "h-8 w-8 p-0 rounded-md border-border"
          )}
        >
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground cursor-not-allowed">
          <ChevronRight size={14} />
        </span>
      )}
    </div>
  );
}
