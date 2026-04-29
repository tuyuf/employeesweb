export interface EmployeeListItem {
  emp_no: number;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  birth_date: string;
  hire_date: string;
  current_department?: string;
  current_title?: string;
  current_salary?: number;
}

export interface EmployeeDetail extends EmployeeListItem {
  departments: {
    dept_no: string;
    dept_name: string;
    from_date: string;
    to_date: string;
  }[];
  titles: {
    title: string;
    from_date: string;
    to_date: string | null;
  }[];
  salaries: {
    salary: number;
    from_date: string;
    to_date: string;
  }[];
  managers: {
    dept_no: string;
    dept_name: string;
    from_date: string;
    to_date: string;
  }[];
  currentManager?: {
    emp_no: number;
    first_name: string;
    last_name: string;
  };
}

export interface DepartmentSummary {
  dept_no: string;
  dept_name: string;
  employee_count: number;
  avg_salary: number;
  manager_name?: string;
  manager_emp_no?: number;
}

export interface ManagerHistoryItem {
  emp_no: number;
  first_name: string;
  last_name: string;
  from_date: string;
  to_date: string;
}

export interface DepartmentDetail {
  dept_no: string;
  dept_name: string;
  employee_count: number;
  avg_salary: number;
  current_manager: {
    emp_no: number;
    first_name: string;
    last_name: string;
  } | null;
  managers: ManagerHistoryItem[];
  employees: EmployeeListItem[];
  pagination: PagePagination;
}

export interface KPIData {
  totalEmployees: number;
  totalDepartments: number;
  avgSalary: number;
  totalPayroll: number;
}

export interface ChartDataItem {
  name: string;
  value: number;
  count?: number;
}

export interface SalaryRange {
  range: string;
  count: number;
}

export interface HiringTrend {
  year: number;
  hires: number;
}

export interface PagePagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export interface CursorPagination {
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: CursorPagination;
}

export interface GenderDistribution {
  gender: string;
  count: number;
}
