-- Neo4j Sync Schema Alignment Migration Part 2
-- Version: 20260221
-- Description: Add remaining columns required by pg_neo4j_sync.py

-- ============================================
-- 1. WBS_GROUPS TABLE - Add missing columns
-- ============================================
ALTER TABLE project.wbs_groups
    ADD COLUMN IF NOT EXISTS code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'NOT_STARTED',
    ADD COLUMN IF NOT EXISTS linked_epic_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS planned_start_date DATE,
    ADD COLUMN IF NOT EXISTS planned_end_date DATE,
    ADD COLUMN IF NOT EXISTS actual_start_date DATE,
    ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- Add foreign key for linked_epic_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_wbs_group_epic'
        AND table_schema = 'project'
        AND table_name = 'wbs_groups'
    ) THEN
        ALTER TABLE project.wbs_groups
            ADD CONSTRAINT fk_wbs_group_epic
            FOREIGN KEY (linked_epic_id) REFERENCES project.epics(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wbs_groups_code ON project.wbs_groups(code);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_status ON project.wbs_groups(status);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_linked_epic_id ON project.wbs_groups(linked_epic_id);

COMMENT ON COLUMN project.wbs_groups.code IS 'WBS code identifier (e.g., WBS-001)';
COMMENT ON COLUMN project.wbs_groups.status IS 'Status: NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD';
COMMENT ON COLUMN project.wbs_groups.linked_epic_id IS 'Link to Epic for agile traceability';
COMMENT ON COLUMN project.wbs_groups.progress IS 'Completion percentage (0-100)';
COMMENT ON COLUMN project.wbs_groups.weight IS 'Relative weight for progress calculation';
COMMENT ON COLUMN project.wbs_groups.planned_start_date IS 'Planned start date';
COMMENT ON COLUMN project.wbs_groups.planned_end_date IS 'Planned end date';
COMMENT ON COLUMN project.wbs_groups.actual_start_date IS 'Actual start date';
COMMENT ON COLUMN project.wbs_groups.actual_end_date IS 'Actual end date';

-- ============================================
-- 2. TASK.TASKS TABLE - Add missing columns
-- ============================================
ALTER TABLE task.tasks
    ADD COLUMN IF NOT EXISTS phase_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS track_type VARCHAR(20) DEFAULT 'COMMON',
    ADD COLUMN IF NOT EXISTS tags TEXT,
    ADD COLUMN IF NOT EXISTS column_id VARCHAR(36);

-- Copy values from kanban_column_id to column_id for compatibility
UPDATE task.tasks SET column_id = kanban_column_id WHERE column_id IS NULL AND kanban_column_id IS NOT NULL;

-- Add foreign key for phase_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_phase'
        AND table_schema = 'task'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE task.tasks
            ADD CONSTRAINT fk_task_phase
            FOREIGN KEY (phase_id) REFERENCES project.phases(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON task.tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_track_type ON task.tasks(track_type);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON task.tasks(column_id);

COMMENT ON COLUMN task.tasks.phase_id IS 'Link to project phase';
COMMENT ON COLUMN task.tasks.track_type IS 'Track type: COMMON, WBS, AGILE';
COMMENT ON COLUMN task.tasks.tags IS 'Comma-separated tags for categorization';
COMMENT ON COLUMN task.tasks.column_id IS 'Alias for kanban_column_id (Neo4j sync compatibility)';

-- ============================================
-- 3. PROJECT.ISSUES TABLE - Add missing columns
-- ============================================
ALTER TABLE project.issues
    ADD COLUMN IF NOT EXISTS resolution VARCHAR(255);

COMMENT ON COLUMN project.issues.resolution IS 'Resolution description when issue is resolved';

-- ============================================
-- 4. Update existing WBS groups with calculated values
-- ============================================
-- Generate codes for existing WBS groups
WITH ordered_wbs AS (
    SELECT id, phase_id, ROW_NUMBER() OVER (PARTITION BY phase_id ORDER BY created_at) as rn
    FROM project.wbs_groups
    WHERE code IS NULL
)
UPDATE project.wbs_groups wg
SET code = 'WBS-' || LPAD(ow.rn::text, 3, '0')
FROM ordered_wbs ow
WHERE wg.id = ow.id;

-- Calculate progress from WBS items
UPDATE project.wbs_groups wg
SET progress = COALESCE((
    SELECT AVG(wi.progress)
    FROM project.wbs_items wi
    WHERE wi.group_id = wg.id
)::integer, 0)
WHERE wg.progress IS NULL OR wg.progress = 0;

-- ============================================
-- 5. Update task track_type based on context
-- ============================================
UPDATE task.tasks t
SET track_type =
    CASE
        WHEN t.user_story_id IS NOT NULL THEN 'AGILE'
        ELSE 'COMMON'
    END
WHERE t.track_type IS NULL OR t.track_type = 'COMMON';
