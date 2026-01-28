-- Feature-Part Ownership Migration
-- Version: 20260212
-- Description: Add part_id to features table for Part-based ownership (Sub-Part = Work Area)
-- Purpose: Enable Part Leaders (PL) to manage features within their responsible area

-- ============================================
-- 1. Add part_id column to features table
-- ============================================

ALTER TABLE project.features
ADD COLUMN IF NOT EXISTS part_id VARCHAR(50);

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_feature_part'
        AND table_schema = 'project'
        AND table_name = 'features'
    ) THEN
        ALTER TABLE project.features
        ADD CONSTRAINT fk_feature_part FOREIGN KEY (part_id)
            REFERENCES project.parts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for part_id queries
CREATE INDEX IF NOT EXISTS idx_features_part_id ON project.features(part_id);

-- Create composite index for project-part queries (via epic -> project)
CREATE INDEX IF NOT EXISTS idx_features_part_status ON project.features(part_id, status);

COMMENT ON COLUMN project.features.part_id IS 'Reference to Part (Work Area) for Part-based ownership. Part Leader is responsible for features in their part.';


-- ============================================
-- 2. Add part_id column to user_stories table (denormalized for query performance)
-- ============================================

ALTER TABLE task.user_stories
ADD COLUMN IF NOT EXISTS part_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_user_stories_part_id ON task.user_stories(part_id);

COMMENT ON COLUMN task.user_stories.part_id IS 'Denormalized part_id from Feature for query performance. Derived from feature.part_id.';


-- ============================================
-- 3. Add part_id column to tasks table (for operational tasks outside stories)
-- ============================================

ALTER TABLE task.tasks
ADD COLUMN IF NOT EXISTS part_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_tasks_part_id ON task.tasks(part_id);

COMMENT ON COLUMN task.tasks.part_id IS 'Part assignment for tasks. Nullable - derived from user_story.part_id by default, can be set directly for operational tasks.';


-- ============================================
-- 4. Create part_members table with role support (if not exists with full structure)
-- ============================================

-- First, check if part_members needs enhancement (add role column if missing)
DO $$
BEGIN
    -- Add role_in_part column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'project'
        AND table_name = 'part_members'
        AND column_name = 'role_in_part'
    ) THEN
        ALTER TABLE project.part_members
        ADD COLUMN role_in_part VARCHAR(50) DEFAULT 'MEMBER';
    END IF;

    -- Add allocation column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'project'
        AND table_name = 'part_members'
        AND column_name = 'allocation'
    ) THEN
        ALTER TABLE project.part_members
        ADD COLUMN allocation INTEGER DEFAULT 100;
    END IF;

    -- Add joined_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'project'
        AND table_name = 'part_members'
        AND column_name = 'joined_at'
    ) THEN
        ALTER TABLE project.part_members
        ADD COLUMN joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

COMMENT ON COLUMN project.part_members.role_in_part IS 'Role within the Part: PL (Part Leader), TL (Tech Lead), MEMBER';
COMMENT ON COLUMN project.part_members.allocation IS 'Resource allocation percentage (0-100)';


-- ============================================
-- 5. Add pl_user_id to parts table for direct PL reference
-- ============================================

-- The parts table already has leader_id column which serves as PL reference
-- Just add a comment for clarity
COMMENT ON COLUMN project.parts.leader_id IS 'Part Leader (PL) user ID - responsible for the work area';


-- ============================================
-- 6. Create view for Part-based backlog aggregation
-- ============================================

CREATE OR REPLACE VIEW project.part_backlog_summary AS
SELECT
    p.id as part_id,
    p.name as part_name,
    p.project_id,
    p.leader_id as pl_user_id,
    COUNT(DISTINCT f.id) as feature_count,
    COUNT(DISTINCT us.id) as story_count,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT CASE WHEN us.status = 'DONE' THEN us.id END) as completed_stories,
    COUNT(DISTINCT CASE WHEN us.status = 'IN_PROGRESS' THEN us.id END) as in_progress_stories,
    COUNT(DISTINCT CASE WHEN t.status = 'BLOCKED' THEN t.id END) as blocked_tasks,
    COALESCE(SUM(CASE WHEN us.status = 'DONE' THEN us.story_points ELSE 0 END), 0) as completed_story_points,
    COALESCE(SUM(us.story_points), 0) as total_story_points
FROM project.parts p
LEFT JOIN project.features f ON f.part_id = p.id
LEFT JOIN task.user_stories us ON us.part_id = p.id
LEFT JOIN task.tasks t ON t.part_id = p.id
GROUP BY p.id, p.name, p.project_id, p.leader_id;

COMMENT ON VIEW project.part_backlog_summary IS 'Aggregated backlog metrics per Part for PL Dashboard';
