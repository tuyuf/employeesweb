'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || 'An unexpected error occurred while loading the dashboard. Please try again.'}
        </p>
        
        <Button onClick={reset} variant="outline" className="mt-4">
          Try again
        </Button>
      </div>
    </div>
  );
}
