import { z } from 'zod';

// Employee list query parameters
export const employeeListSchema = z.object({
  cursor: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  size: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).default(''),
  department: z.string().max(100).default(''),
  sortBy: z.enum(['emp_no', 'first_name', 'last_name', 'hire_date', 'salary', 'dept_name', 'title']).default('emp_no'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Employee ID parameter
export const employeeIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Department ID parameter
export const departmentIdSchema = z.object({
  id: z.string().min(1).max(10),
});

// Department employees query parameters
export const departmentEmployeesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
});

// Pagination parameters
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
});

export type EmployeeListInput = z.infer<typeof employeeListSchema>;
export type EmployeeIdInput = z.infer<typeof employeeIdSchema>;
export type DepartmentIdInput = z.infer<typeof departmentIdSchema>;
export type DepartmentEmployeesInput = z.infer<typeof departmentEmployeesSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
