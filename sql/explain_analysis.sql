-- ============================================================
-- EXPLAIN ANALYSIS: Performance Comparison
-- ============================================================
-- These queries demonstrate the performance difference between
-- queries with and without the last_name index.
-- ============================================================

-- ----------------------------------------------------------
-- BEFORE INDEX: Force Sequential Scan (Full Table Scan)
-- ----------------------------------------------------------
-- This simulates the query behavior without using the index
SET enable_indexscan = off;
SET enable_bitmapscan = off;

EXPLAIN ANALYZE
SELECT emp_no, first_name, last_name, hire_date
FROM employees
WHERE last_name = 'Baba';

-- Reset scan settings
SET enable_indexscan = on;
SET enable_bitmapscan = on;

-- ----------------------------------------------------------
-- AFTER INDEX: Index Scan Enabled (Optimized)
-- ----------------------------------------------------------
-- With the index, PostgreSQL will use Index Scan instead of Seq Scan
EXPLAIN ANALYZE
SELECT emp_no, first_name, last_name, hire_date
FROM employees
WHERE last_name = 'Baba';

-- ----------------------------------------------------------
-- EXPLAIN ANALYZE: Wildcard Search (Prefix Matching)
-- ----------------------------------------------------------
-- Prefix searches like 'last_name LIKE 'B%'' also benefit from the index
EXPLAIN ANALYZE
SELECT emp_no, first_name, last_name, hire_date
FROM employees
WHERE last_name LIKE 'B%';

-- ----------------------------------------------------------
-- EXPLAIN ANALYZE: Case-Insensitive Search (ILIKE)
-- ----------------------------------------------------------
-- Note: ILIKE with prefix patterns can still use B-tree indexes
EXPLAIN ANALYZE
SELECT emp_no, first_name, last_name, hire_date
FROM employees
WHERE last_name ILIKE 'baba%';

-- ----------------------------------------------------------
-- Verify Index is Being Used
-- ----------------------------------------------------------
-- Check the query plan to confirm index usage
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT emp_no, first_name, last_name
FROM employees
WHERE last_name = 'Baba';