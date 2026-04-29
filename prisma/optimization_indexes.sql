-- Performance indexes for optimized latest record lookups
-- These support the ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) CTEs

-- Index for dept_emp latest record lookups
CREATE INDEX IF NOT EXISTS idx_dept_emp_emp_no_from_desc 
ON employees_temp.dept_emp(emp_no, from_date DESC);

-- Index for salaries latest record lookups
CREATE INDEX IF NOT EXISTS idx_salaries_emp_no_from_desc 
ON employees_temp.salaries(emp_no, from_date DESC);

-- Index for titles latest record lookups
CREATE INDEX IF NOT EXISTS idx_titles_emp_no_from_desc 
ON employees_temp.titles(emp_no, from_date DESC);

-- Index for dept_manager latest record lookups
CREATE INDEX IF NOT EXISTS idx_dept_manager_dept_no_from_desc 
ON employees_temp.dept_manager(dept_no, from_date DESC);

-- Composite index for employee search (hire_date is used in cursor pagination)
CREATE INDEX IF NOT EXISTS idx_employees_hire_date_emp_no 
ON employees_temp.employees(hire_date, emp_no);

-- Index for department name lookups (used in filtering)
CREATE INDEX IF NOT EXISTS idx_departments_dept_name 
ON employees_temp.departments(dept_name);