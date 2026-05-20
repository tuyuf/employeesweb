-- ============================================================
-- MATERIALIZED VIEW: mv_current_employees
-- ============================================================
-- Pre-computes current employee snapshot with department, title,
-- and salary information. Eliminates repeated CTEs across pages.
-- 
-- Benefits:
-- - Dashboard: Faster KPI calculations
-- - Employees: Instant current data lookups
-- - Departments: Pre-calculated employee counts
-- - Analytics: Title/department aggregations
-- - History: Current employee info joins
--
-- Refresh strategy: Run REFRESH MATERIALIZED VIEW CONCURRENTLY
-- when data changes, or on a schedule (e.g., every 5 minutes)
-- ============================================================

-- Drop existing materialized view if exists
DROP MATERIALIZED VIEW IF EXISTS mv_current_employees;

-- Create materialized view with current employee data
CREATE MATERIALIZED VIEW mv_current_employees AS
SELECT 
  e.emp_no,
  e.first_name,
  e.last_name,
  CONCAT(e.first_name, ' ', e.last_name) AS full_name,
  e.gender,
  e.birth_date,
  e.hire_date,
  -- Current department (latest dept_emp entry)
  d.dept_no AS current_dept_no,
  d.dept_name AS current_department,
  -- Current title (latest titles entry)
  t.title AS current_title,
  -- Current salary (latest salaries entry)
  s.salary AS current_salary,
  -- Calculated fields for analytics
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date))::int AS years_with_company,
  CASE 
    WHEN s.salary IS NULL THEN NULL
    WHEN s.salary < 40000 THEN '< 40K'
    WHEN s.salary < 50000 THEN '40-50K'
    WHEN s.salary < 60000 THEN '50-60K'
    WHEN s.salary < 70000 THEN '60-70K'
    WHEN s.salary < 80000 THEN '70-80K'
    WHEN s.salary < 90000 THEN '80-90K'
    WHEN s.salary < 100000 THEN '90-100K'
    ELSE '100K+'
  END AS salary_range
FROM employees e
-- Latest department
LEFT JOIN LATERAL (
  SELECT de.dept_no, de.from_date
  FROM dept_emp de 
  WHERE de.emp_no = e.emp_no 
  ORDER BY de.from_date DESC 
  LIMIT 1
) latest_de ON true
LEFT JOIN departments d ON d.dept_no = latest_de.dept_no
-- Latest salary
LEFT JOIN LATERAL (
  SELECT s.salary, s.from_date
  FROM salaries s 
  WHERE s.emp_no = e.emp_no 
  ORDER BY s.from_date DESC 
  LIMIT 1
) latest_s ON true
LEFT JOIN salaries s ON s.emp_no = e.emp_no AND s.from_date = latest_s.from_date
-- Latest title
LEFT JOIN LATERAL (
  SELECT t.title, t.from_date
  FROM titles t 
  WHERE t.emp_no = e.emp_no 
  ORDER BY t.from_date DESC 
  LIMIT 1
) latest_t ON true
LEFT JOIN titles t ON t.emp_no = e.emp_no AND t.from_date = latest_t.from_date;

-- Create indexes for common query patterns
-- Primary lookup by emp_no
CREATE UNIQUE INDEX idx_mv_emp_no ON mv_current_employees(emp_no);

-- Index for last_name searches (supports index-optimized search)
CREATE INDEX idx_mv_last_name ON mv_current_employees(last_name);

-- Index for department aggregations
CREATE INDEX idx_mv_department ON mv_current_employees(current_department);

-- Index for title aggregations
CREATE INDEX idx_mv_title ON mv_current_employees(current_title);

-- Index for salary range queries
CREATE INDEX idx_mv_salary_range ON mv_current_employees(salary_range);

-- Verify creation
SELECT 
  'mv_current_employees created successfully' AS status,
  COUNT(*) AS total_employees,
  COUNT(current_department) AS with_department,
  COUNT(current_title) AS with_title,
  COUNT(current_salary) AS with_salary
FROM mv_current_employees;
