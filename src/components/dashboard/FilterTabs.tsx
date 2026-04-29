'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

const tabs = ['Day', 'Week', 'Month', 'Year'] as const;

export default function FilterTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]>('Month');

  return (
    <div className="flex items-center justify-between animate-fade-in-up">
      <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              active === tab
                ? 'bg-black text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2">
        <Calendar size={14} className="text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground">
          1 Sep 2024 - 31 Sep 2024
        </span>
      </div>
    </div>
  );
}
