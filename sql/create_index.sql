-- ============================================================
-- TASK B: Index Creation - last_name column optimization
-- ============================================================
-- This index optimizes queries searching/filtering by last_name
-- to eliminate full table scans and reduce query latency.
-- ============================================================

-- Check if index already exists before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_employees_last_name'
    ) THEN
        CREATE INDEX idx_employees_last_name ON employees(last_name);
        RAISE NOTICE 'Index idx_employees_last_name created successfully';
    ELSE
        RAISE NOTICE 'Index idx_employees_last_name already exists';
    END IF;
END $$;

-- Alternative: Create index with IF NOT EXISTS (PostgreSQL 9.5+)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_last_name ON employees(last_name);

-- Verify index was created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'employees'
AND indexname = 'idx_employees_last_name';