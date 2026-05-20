import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { employeeIdSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Validate ID with zod
  const validationResult = employeeIdSchema.safeParse({ id });
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid employee ID', details: validationResult.error.format() },
      { status: 400 }
    );
  }
  
  const empNo = validationResult.data.id;
  
  try {

    const employee = await prisma.employee.findUnique({
      where: { emp_no: empNo },
      select: {
        emp_no: true,
        first_name: true,
        last_name: true,
        gender: true,
        birth_date: true,
        hire_date: true,
        dept_emps: {
          select: {
            dept_no: true,
            from_date: true,
            to_date: true,
            department: { select: { dept_name: true } }
          },
          orderBy: { from_date: 'desc' },
        },
        titles: {
          select: { title: true, from_date: true, to_date: true },
          orderBy: { from_date: 'desc' },
        },
        salaries: {
          select: { salary: true, from_date: true, to_date: true },
          orderBy: { from_date: 'desc' },
          take: 10,
        },
        dept_managers: {
          select: {
            dept_no: true,
            from_date: true,
            to_date: true,
            department: { select: { dept_name: true } }
          },
          orderBy: { from_date: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Find current manager
    let currentManager = null;
    const currentDeptNo = employee.dept_emps[0]?.dept_no;
    if (currentDeptNo) {
      const managerRecord = await prisma.deptManager.findFirst({
        where: {
          dept_no: currentDeptNo,
          to_date: new Date('9999-01-01'),
        },
        select: {
          employee: {
            select: { emp_no: true, first_name: true, last_name: true }
          }
        },
        orderBy: { from_date: 'desc' },
      });
      if (managerRecord) {
        currentManager = {
          emp_no: managerRecord.employee.emp_no,
          first_name: managerRecord.employee.first_name,
          last_name: managerRecord.employee.last_name,
        };
      }
    }

    // Transform into the EmployeeDetail shape
    const employeeDetail = {
      emp_no: employee.emp_no,
      first_name: employee.first_name,
      last_name: employee.last_name,
      gender: employee.gender,
      birth_date: employee.birth_date,
      hire_date: employee.hire_date,
      
      // Get current values
      current_department: employee.dept_emps[0]?.department.dept_name,
      current_title: employee.titles[0]?.title,
      current_salary: employee.salaries[0]?.salary,
      
      departments: employee.dept_emps.map(de => ({
        dept_no: de.dept_no,
        dept_name: de.department.dept_name,
        from_date: de.from_date,
        to_date: de.to_date,
      })),
      
      titles: employee.titles.map(t => ({
        title: t.title,
        from_date: t.from_date,
        to_date: t.to_date,
      })),
      
      salaries: employee.salaries.map(s => ({
        salary: s.salary,
        from_date: s.from_date,
        to_date: s.to_date,
      })),
      
      managers: employee.dept_managers.map(dm => ({
        dept_no: dm.dept_no,
        dept_name: dm.department.dept_name,
        from_date: dm.from_date,
        to_date: dm.to_date,
      })),
      currentManager,
    };

    return NextResponse.json(employeeDetail);
  } catch (error) {
    console.error(`Error fetching employee ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch employee details' },
      { status: 500 }
    );
  }
}
