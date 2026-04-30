'use client';

import { EmployeeListItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface EmployeeTableProps {
  employees: EmployeeListItem[];
}

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <Card className="rounded-[16px] p-12 text-center animate-fade-in-up">
        <p className="text-lg font-bold text-muted-foreground italic">No records found matching your criteria</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden animate-fade-in-up">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="w-[100px] h-14 pl-8 text-[12px] uppercase tracking-wide text-muted-foreground">ID</TableHead>
            <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground">Full Name</TableHead>
            <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground">Department</TableHead>
            <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground text-center">Gender</TableHead>
            <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground text-right">Compensation</TableHead>
            <TableHead className="h-14 text-[12px] uppercase tracking-wide text-muted-foreground pr-8">Joined</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.emp_no} className="hover:bg-transparent transition-all duration-150 border-b border-border last:border-0 group">
              <TableCell className="pl-8 py-6 font-mono text-[12px] text-muted-foreground">
                #{emp.emp_no}
              </TableCell>
              <TableCell className="py-6 text-foreground font-medium">
                {emp.first_name} {emp.last_name}
              </TableCell>
              <TableCell className="py-6">
                {emp.current_department ? (
                  <Badge variant="secondary" className="px-3 py-1 h-6 text-[11px] uppercase tracking-wider rounded-full">
                    {emp.current_department}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="py-6 text-center">
                <span className="inline-flex items-center justify-center w-14 h-6 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                  {emp.gender === 'M' ? 'Male' : 'Female'}
                </span>
              </TableCell>
              <TableCell className="py-6 text-right text-[14px] text-foreground">
                {emp.current_salary ? formatCurrency(emp.current_salary) : '—'}
              </TableCell>
              <TableCell className="py-6 text-muted-foreground text-[12px] pr-8">
                {formatDate(emp.hire_date)}
              </TableCell>
              <TableCell className="pr-6">
                <Link
                  href={`/employees/${emp.emp_no}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "rounded-full px-4 h-8 text-[11px] font-medium border-border")}
                >
                  View Detail
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}