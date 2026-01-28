-- Weekly Reports Part Scope Migration
-- Version: 20260213
-- Description: Add part_id to weekly_reports for Part-level (PL) reporting

-- ============================================
-- 1. Add part_id column to weekly_reports table
-- ============================================

ALTER TABLE task.weekly_reports
ADD COLUMN IF NOT EXISTS part_id VARCHAR(50);

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_weekly_report_part'
        AND table_schema = 'task'
        AND table_name = 'weekly_reports'
    ) THEN
        ALTER TABLE task.weekly_reports
        ADD CONSTRAINT fk_weekly_report_part FOREIGN KEY (part_id)
            REFERENCES project.parts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for part-based queries
CREATE INDEX IF NOT EXISTS idx_weekly_reports_part_id ON task.weekly_reports(part_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_project_part ON task.weekly_reports(project_id, part_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_part_week ON task.weekly_reports(part_id, year, week_number);

COMMENT ON COLUMN task.weekly_reports.part_id IS 'Part (Work Area) ID for Part-level weekly reports. NULL for project-wide reports.';


-- ============================================
-- 2. Add scope_type column to distinguish report scope
-- ============================================

ALTER TABLE task.weekly_reports
ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) DEFAULT 'PROJECT';

COMMENT ON COLUMN task.weekly_reports.scope_type IS 'Report scope: PROJECT (PM view) or PART (PL view)';


-- ============================================
-- 3. Update report_templates for Part scope support
-- ============================================

ALTER TABLE report.report_templates
ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) DEFAULT 'PROJECT';

COMMENT ON COLUMN report.report_templates.scope_type IS 'Template scope: PROJECT or PART';


-- ============================================
-- 4. Create part_weekly_report_summary view
-- ============================================

CREATE OR REPLACE VIEW task.part_weekly_report_summary AS
SELECT
    wr.id,
    wr.project_id,
    wr.part_id,
    p.name as part_name,
    p.leader_id as pl_user_id,
    p.leader_name as pl_name,
    wr.week_start_date,
    wr.week_end_date,
    wr.year,
    wr.week_number,
    wr.total_tasks,
    wr.completed_tasks,
    wr.in_progress_tasks,
    wr.blocked_tasks,
    wr.story_points_completed,
    wr.story_points_in_progress,
    wr.story_points_planned,
    wr.summary,
    wr.scope_type,
    wr.created_at
FROM task.weekly_reports wr
LEFT JOIN project.parts p ON wr.part_id = p.id
WHERE wr.part_id IS NOT NULL;

COMMENT ON VIEW task.part_weekly_report_summary IS 'Part-level weekly report summary with Part Leader info';
