-- Add estimated_hours and actual_hours columns to wbs_tasks table
-- Version: 20260225
-- Description: Enable time estimation at Task level (same as wbs_items)

ALTER TABLE project.wbs_tasks
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10,2) DEFAULT 0;

-- Create index for reporting queries
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_estimated_hours ON project.wbs_tasks(estimated_hours);

COMMENT ON COLUMN project.wbs_tasks.estimated_hours IS 'Estimated hours to complete the task';
COMMENT ON COLUMN project.wbs_tasks.actual_hours IS 'Actual hours spent on the task';
