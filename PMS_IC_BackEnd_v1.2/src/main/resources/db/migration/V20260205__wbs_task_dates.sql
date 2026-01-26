-- WBS Task Date Fields Migration
-- Version: 20260205
-- Description: Add date columns to wbs_tasks table for scheduling and critical path calculation

-- ============================================
-- 1. Add Date Columns to wbs_tasks
-- ============================================

ALTER TABLE project.wbs_tasks
ADD COLUMN IF NOT EXISTS planned_start_date DATE;

ALTER TABLE project.wbs_tasks
ADD COLUMN IF NOT EXISTS planned_end_date DATE;

ALTER TABLE project.wbs_tasks
ADD COLUMN IF NOT EXISTS actual_start_date DATE;

ALTER TABLE project.wbs_tasks
ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- ============================================
-- 2. Create Indexes for Date Queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wbs_tasks_planned_start
    ON project.wbs_tasks(planned_start_date);

CREATE INDEX IF NOT EXISTS idx_wbs_tasks_planned_end
    ON project.wbs_tasks(planned_end_date);

CREATE INDEX IF NOT EXISTS idx_wbs_tasks_actual_start
    ON project.wbs_tasks(actual_start_date);

CREATE INDEX IF NOT EXISTS idx_wbs_tasks_actual_end
    ON project.wbs_tasks(actual_end_date);

-- ============================================
-- 3. Add Comments
-- ============================================

COMMENT ON COLUMN project.wbs_tasks.planned_start_date IS 'Planned start date for the task';
COMMENT ON COLUMN project.wbs_tasks.planned_end_date IS 'Planned end date for the task';
COMMENT ON COLUMN project.wbs_tasks.actual_start_date IS 'Actual start date when task began';
COMMENT ON COLUMN project.wbs_tasks.actual_end_date IS 'Actual end date when task completed';

-- ============================================
-- 4. Update Existing Tasks with Calculated Dates
-- (Optional: Derive dates from parent WbsItem if available)
-- ============================================

-- Update tasks that have no dates but their parent item has dates
-- This provides reasonable defaults based on item dates
UPDATE project.wbs_tasks t
SET planned_start_date = i.planned_start_date,
    planned_end_date = i.planned_end_date
FROM project.wbs_items i
WHERE t.item_id = i.id
  AND t.planned_start_date IS NULL
  AND t.planned_end_date IS NULL
  AND (i.planned_start_date IS NOT NULL OR i.planned_end_date IS NOT NULL);
