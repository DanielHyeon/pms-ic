-- Neo4j Sync Schema Alignment Migration
-- Version: 20260220
-- Description: Add missing columns required by pg_neo4j_sync.py for Neo4j synchronization

-- ============================================
-- 1. EPIC TABLE - Add missing columns
-- ============================================
ALTER TABLE project.epics
    ADD COLUMN IF NOT EXISTS business_value INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_story_points INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS target_completion_date DATE;

COMMENT ON COLUMN project.epics.business_value IS 'Business value score for prioritization (0-100)';
COMMENT ON COLUMN project.epics.total_story_points IS 'Sum of story points across all features';
COMMENT ON COLUMN project.epics.item_count IS 'Number of features/items in this epic';
COMMENT ON COLUMN project.epics.target_completion_date IS 'Target date for epic completion';

-- ============================================
-- 2. FEATURES TABLE - Add missing columns
-- ============================================
ALTER TABLE project.features
    ADD COLUMN IF NOT EXISTS wbs_group_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS order_num INTEGER DEFAULT 0;

-- Add foreign key for wbs_group_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_feature_wbs_group'
        AND table_schema = 'project'
        AND table_name = 'features'
    ) THEN
        ALTER TABLE project.features
            ADD CONSTRAINT fk_feature_wbs_group
            FOREIGN KEY (wbs_group_id) REFERENCES project.wbs_groups(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_features_wbs_group_id ON project.features(wbs_group_id);

COMMENT ON COLUMN project.features.wbs_group_id IS 'Link to WBS group for traceability';
COMMENT ON COLUMN project.features.order_num IS 'Display order within epic';

-- ============================================
-- 3. WBS_ITEMS TABLE - Add missing columns
-- ============================================
ALTER TABLE project.wbs_items
    ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS assignee_id VARCHAR(36);

-- Add foreign key for assignee_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_wbs_item_assignee'
        AND table_schema = 'project'
        AND table_name = 'wbs_items'
    ) THEN
        ALTER TABLE project.wbs_items
            ADD CONSTRAINT fk_wbs_item_assignee
            FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wbs_items_assignee_id ON project.wbs_items(assignee_id);

COMMENT ON COLUMN project.wbs_items.estimated_hours IS 'Estimated work hours for this item';
COMMENT ON COLUMN project.wbs_items.actual_hours IS 'Actual hours spent on this item';
COMMENT ON COLUMN project.wbs_items.assignee_id IS 'User assigned to this WBS item';

-- ============================================
-- 4. Update existing epic data with calculated values
-- ============================================
UPDATE project.epics e
SET
    item_count = COALESCE((
        SELECT COUNT(*) FROM project.features f WHERE f.epic_id = e.id
    ), 0),
    business_value = COALESCE(
        CASE
            WHEN e.priority = 'CRITICAL' THEN 100
            WHEN e.priority = 'HIGH' THEN 80
            WHEN e.priority = 'MEDIUM' THEN 50
            WHEN e.priority = 'LOW' THEN 20
            ELSE 50
        END, 50
    )
WHERE e.business_value IS NULL OR e.business_value = 0;

-- ============================================
-- 5. Update features with order_num based on creation order
-- ============================================
WITH ordered_features AS (
    SELECT id, epic_id, ROW_NUMBER() OVER (PARTITION BY epic_id ORDER BY created_at) as rn
    FROM project.features
)
UPDATE project.features f
SET order_num = of.rn
FROM ordered_features of
WHERE f.id = of.id AND (f.order_num IS NULL OR f.order_num = 0);
