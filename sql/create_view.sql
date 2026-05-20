-- ============================================================
-- TASK A: View Creation - vw_manager_profiles
-- ============================================================
-- This view contains the manager's identity, the department they lead,
-- and their complete tenure period from the dept_manager table.
-- ============================================================

DROP VIEW IF EXISTS vw_manager_profiles;

CREATE VIEW vw_manager_profiles AS
SELECT
    dm.emp_no AS manager_emp_no,
    e.first_name AS manager_first_name,
    e.last_name AS manager_last_name,
    CONCAT(e.first_name, ' ', e.last_name) AS manager_full_name,
    d.dept_no,
    d.dept_name AS department_name,
    dm.from_date AS tenure_start_date,
    dm.to_date AS tenure_end_date,
    CASE
        WHEN dm.to_date = '9999-01-01'::date OR dm.to_date > CURRENT_DATE
        THEN 'Current'
        ELSE 'Former'
    END AS manager_status,
    CASE
        WHEN dm.to_date = '9999-01-01'::date OR dm.to_date > CURRENT_DATE
        THEN NULL
        ELSE dm.to_date - dm.from_date
    END AS tenure_days
FROM dept_manager dm
INNER JOIN employees e ON dm.emp_no = e.emp_no
INNER JOIN departments d ON dm.dept_no = d.dept_no
ORDER BY d.dept_name, dm.from_date;

-- Verify view was created
SELECT 'View vw_manager_profiles created successfully' AS status;

-- Sample query to test the view
SELECT * FROM vw_manager_profiles LIMIT 10;