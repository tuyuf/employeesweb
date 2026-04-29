'use client';

import { RefreshCw, Maximize2 } from 'lucide-react';

interface Purchase {
  courseName: string;
  courseImage: string;
  studentName: string;
  studentId: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Refunded';
}

const MOCK_PURCHASES: Purchase[] = [
  {
    courseName: 'Digital Marketing',
    courseImage: '📊',
    studentName: 'Aria',
    studentId: '#3456791',
    amount: '$ 372,00',
    status: 'Paid',
  },
  {
    courseName: 'UI/UX Design',
    courseImage: '🎨',
    studentName: 'Bella',
    studentId: '#3456792',
    amount: '$ 450,00',
    status: 'Paid',
  },
  {
    courseName: 'Web Development',
    courseImage: '💻',
    studentName: 'Carlos',
    studentId: '#3456793',
    amount: '$ 520,00',
    status: 'Pending',
  },
  {
    courseName: 'Data Science',
    courseImage: '📈',
    studentName: 'Diana',
    studentId: '#3456794',
    amount: '$ 680,00',
    status: 'Paid',
  },
  {
    courseName: 'Cloud Computing',
    courseImage: '☁️',
    studentName: 'Erik',
    studentId: '#3456795',
    amount: '$ 399,00',
    status: 'Refunded',
  },
];

const statusStyles = {
  Paid: 'bg-[#22c55e] text-white',
  Pending: 'bg-[#f59e0b] text-white',
  Refunded: 'bg-[#ef4444] text-white',
};

export default function CoursePurchasesTable() {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden animate-fade-in-up stagger-5">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-[16px] font-semibold text-foreground">Course Purchases</h3>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 transition-colors">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 transition-colors">
            <Maximize2 size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Course Name
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PURCHASES.map((purchase, idx) => (
              <tr
                key={idx}
                className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center text-[16px]">
                      {purchase.courseImage}
                    </div>
                    <span className="text-[13px] font-medium text-foreground">{purchase.courseName}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-[13px] text-foreground">{purchase.studentName}</td>
                <td className="px-6 py-3.5 text-[13px] text-muted-foreground font-mono">{purchase.studentId}</td>
                <td className="px-6 py-3.5 text-[13px] font-semibold text-foreground">{purchase.amount}</td>
                <td className="px-6 py-3.5">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold ${statusStyles[purchase.status]}`}
                  >
                    {purchase.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
