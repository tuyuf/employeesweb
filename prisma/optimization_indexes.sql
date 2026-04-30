-- Performance indexes for optimized latest record lookups
-- These support the ROW_NUMBER() OVER (PARTITION BY emp_no ORDER BY from_date DESC) CTEs
-- Requires: psql -d <database> -f optimization_indexes.sql

-- Enable trigram extension for fast ILIKE %keyword% search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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

-- GIN trigram index for fast ILIKE %keyword% on employee names
CREATE INDEX IF NOT EXISTS idx_employees_first_name_trgm 
ON employees_temp.employees USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_employees_last_name_trgm 
ON employees_temp.employees USING GIN (last_name gin_trgm_ops);

-- Expression index for fast emp_no::text prefix search
CREATE INDEX IF NOT EXISTS idx_employees_emp_no_text 
ON employees_temp.employees ((emp_no::text));