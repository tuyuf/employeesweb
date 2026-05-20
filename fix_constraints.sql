-- Fix primary keys
ALTER TABLE employees ADD CONSTRAINT idx_16400_primary PRIMARY KEY (emp_no);
ALTER TABLE departments ADD CONSTRAINT idx_16391_primary PRIMARY KEY (dept_no);
ALTER TABLE dept_emp ADD CONSTRAINT idx_16394_primary PRIMARY KEY (emp_no, dept_no);
ALTER TABLE dept_manager ADD CONSTRAINT idx_16397_primary PRIMARY KEY (emp_no, dept_no);
ALTER TABLE salaries ADD CONSTRAINT idx_16403_primary PRIMARY KEY (emp_no, from_date);
ALTER TABLE titles ADD CONSTRAINT idx_16406_primary PRIMARY KEY (emp_no, title, from_date);

-- Fix unique constraints
ALTER TABLE departments ADD CONSTRAINT idx_16391_dept_name UNIQUE (dept_name);

-- Fix foreign keys
ALTER TABLE dept_emp ADD CONSTRAINT dept_emp_ibfk_1 FOREIGN KEY (emp_no) REFERENCES employees(emp_no) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE dept_emp ADD CONSTRAINT dept_emp_ibfk_2 FOREIGN KEY (dept_no) REFERENCES departments(dept_no) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE dept_manager ADD CONSTRAINT dept_manager_ibfk_1 FOREIGN KEY (emp_no) REFERENCES employees(emp_no) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE dept_manager ADD CONSTRAINT dept_manager_ibfk_2 FOREIGN KEY (dept_no) REFERENCES departments(dept_no) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE salaries ADD CONSTRAINT salaries_ibfk_1 FOREIGN KEY (emp_no) REFERENCES employees(emp_no) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE titles ADD CONSTRAINT titles_ibfk_1 FOREIGN KEY (emp_no) REFERENCES employees(emp_no) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Fix indexes
CREATE INDEX idx_dept_emp_dept_no ON dept_emp(dept_no);
CREATE INDEX idx_employees_hire_date_emp_no ON employees(hire_date, emp_no);
CREATE INDEX idx_employees_first_name ON employees(first_name);
CREATE INDEX idx_employees_last_name ON employees(last_name);
CREATE INDEX idx_dept_emp_dept_no_to_date_emp_no ON dept_emp(dept_no, to_date, emp_no);
CREATE INDEX idx_dept_emp_emp_no_from_date ON dept_emp(emp_no, from_date);
CREATE INDEX idx_dept_manager_dept_no_from_date ON dept_manager(dept_no, from_date);