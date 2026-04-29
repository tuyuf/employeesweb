import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

interface CountResult {
  count: bigint;
}

interface MismatchResult {
  mismatched: bigint;
}

export async function GET() {
  try {
    const deptEmpCount = await prisma.$queryRaw<CountResult[]>`SELECT COUNT(*) FROM dept_emp`;
    
    const sample = await prisma.$queryRaw<{emp_no: number; first_name: string; last_name: string; dept_name: string}[]>`
      SELECT e.emp_no, e.first_name, e.last_name, d.dept_name 
      FROM employees e
      LEFT JOIN dept_emp de ON e.emp_no = de.emp_no
      LEFT JOIN departments d ON de.dept_no = d.dept_no
      LIMIT 10
    `;
    
    const mismatchedEmp = await prisma.$queryRaw<MismatchResult[]>`
      SELECT COUNT(*) as mismatched 
      FROM dept_emp de
      WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.emp_no = de.emp_no)
    `;
    
    const mismatchedDept = await prisma.$queryRaw<MismatchResult[]>`
      SELECT COUNT(*) as mismatched 
      FROM dept_emp de
      WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.dept_no = de.dept_no)
    `;

    return NextResponse.json({
      deptEmpCount: Number(deptEmpCount[0]?.count || 0),
      sample,
      mismatchedEmpNo: Number(mismatchedEmp[0]?.mismatched || 0),
      mismatchedDeptNo: Number(mismatchedDept[0]?.mismatched || 0)
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}