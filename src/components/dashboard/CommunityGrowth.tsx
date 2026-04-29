'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface CommunityGrowthProps {
  percentage?: number;
  change?: string;
}

export default function CommunityGrowth({ percentage = 65, change = '0.9%' }: CommunityGrowthProps) {
  const [offset, setOffset] = useState(283);
  const circumference = 2 * Math.PI * 45; // ~283

  useEffect(() => {
    const timer = setTimeout(() => {
      const newOffset = circumference - (percentage / 100) * circumference;
      setOffset(newOffset);
    }, 300);
    return () => clearTimeout(timer);
  }, [percentage, circumference]);

  return (
    <div className="bg-white border border-border rounded-2xl p-5 animate-scale-in stagger-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="text-[15px] font-semibold text-foreground">Community growth</h4>
          <div className="flex items-center gap-1.5 mt-1.5">
            <TrendingUp size={13} className="text-[#22c55e]" />
            <span className="text-[12px] font-medium text-[#22c55e]">{change}</span>
            <span className="text-[12px] text-muted-foreground">from last month</span>
          </div>
        </div>

        {/* Circular Progress */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="circular-progress w-full h-full" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e8e5e0"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="black"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute text-[14px] font-bold text-foreground">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
