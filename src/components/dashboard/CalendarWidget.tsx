'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS_OF_WEEK = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DATES = [17, 18, 19, 20, 21] as const;
const TODAY_INDEX = 2; // Thursday = index 2

export default function CalendarWidget() {
  const [month] = useState('September 2024');

  return (
    <div className="bg-white border border-border rounded-2xl p-5 animate-scale-in stagger-3">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors">
          <ChevronLeft size={16} className="text-muted-foreground" />
        </button>
        <span className="text-[14px] font-semibold text-foreground">{month}</span>
        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors">
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-5 gap-2">
        {DAYS_OF_WEEK.map((day, i) => (
          <div key={day} className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">{day}</span>
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-[14px] font-semibold transition-all ${
                i === TODAY_INDEX
                  ? 'bg-black text-white shadow-md'
                  : 'text-foreground hover:bg-muted/60'
              }`}
            >
              {DATES[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
