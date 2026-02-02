-- WBS and Feature Tables Migration
-- Version: 20260125
-- Description: Create WBS structure tables (WbsGroup, WbsItem, WbsTask) and Feature table for Phase-WBS-Backlog integration

-- ============================================
-- 1. WBS Groups Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_groups (
    id VARCHAR(36) PRIMARY KEY,
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    progress INTEGER DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    weight INTEGER DEFAULT 100,
    order_num INTEGER DEFAULT 0,
    linked_epic_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_group_phase FOREIGN KEY (phase_id)
        REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_group_epic FOREIGN KEY (linked_epic_id)
        REFERENCES project.epics(id) ON DELETE SET NULL,
    CONSTRAINT uk_phase_wbs_group_code UNIQUE (phase_id, code)
);

CREATE INDEX IF NOT EXISTS idx_wbs_groups_phase_id ON project.wbs_groups(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_status ON project.wbs_groups(status);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_linked_epic_id ON project.wbs_groups(linked_epic_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_order ON project.wbs_groups(order_num);

COMMENT ON TABLE project.wbs_groups IS 'WBS Group - Second level in WBS hierarchy (Phase -> WbsGroup -> WbsItem -> WbsTask)';
COMMENT ON COLUMN project.wbs_groups.status IS 'NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED';
COMMENT ON COLUMN project.wbs_groups.weight IS 'Weight for progress calculation (default 100)';
COMMENT ON COLUMN project.wbs_groups.linked_epic_id IS 'Reference to Epic entity for Phase-WBS-Backlog integration';


-- ============================================
-- 2. WBS Items Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_items (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    progress INTEGER DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    weight INTEGER DEFAULT 100,
    order_num INTEGER DEFAULT 0,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    assignee_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_item_group FOREIGN KEY (group_id)
        REFERENCES project.wbs_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_item_phase FOREIGN KEY (phase_id)
        REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT uk_group_wbs_item_code UNIQUE (group_id, code)
);

CREATE INDEX IF NOT EXISTS idx_wbs_items_group_id ON project.wbs_items(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_phase_id ON project.wbs_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_status ON project.wbs_items(status);
CREATE INDEX IF NOT EXISTS idx_wbs_items_assignee_id ON project.wbs_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_order ON project.wbs_items(order_num);

COMMENT ON TABLE project.wbs_items IS 'WBS Item - Third level in WBS hierarchy (Phase -> WbsGroup -> WbsItem -> WbsTask)';
COMMENT ON COLUMN project.wbs_items.status IS 'NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED';
COMMENT ON COLUMN project.wbs_items.weight IS 'Weight for progress calculation within group (default 100)';


-- ============================================
-- 3. WBS Tasks Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_tasks (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    progress INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 100,
    order_num INTEGER DEFAULT 0,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    assignee_id VARCHAR(36),
    linked_task_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_task_item FOREIGN KEY (item_id)
        REFERENCES project.wbs_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_task_group FOREIGN KEY (group_id)
        REFERENCES project.wbs_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_task_phase FOREIGN KEY (phase_id)
        REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT uk_item_wbs_task_code UNIQUE (item_id, code)
);

CREATE INDEX IF NOT EXISTS idx_wbs_tasks_item_id ON project.wbs_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_group_id ON project.wbs_tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_phase_id ON project.wbs_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_status ON project.wbs_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_assignee_id ON project.wbs_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_linked_task_id ON project.wbs_tasks(linked_task_id);

COMMENT ON TABLE project.wbs_tasks IS 'WBS Task - Fourth level in WBS hierarchy (Phase -> WbsGroup -> WbsItem -> WbsTask)';
COMMENT ON COLUMN project.wbs_tasks.linked_task_id IS 'Reference to task.tasks.id for WBS-Task integration';


-- ============================================
-- 4. Feature Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.features (
    id VARCHAR(36) PRIMARY KEY,
    epic_id VARCHAR(36) NOT NULL,
    wbs_group_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_feature_epic FOREIGN KEY (epic_id)
        REFERENCES project.epics(id) ON DELETE CASCADE,
    CONSTRAINT fk_feature_wbs_group FOREIGN KEY (wbs_group_id)
        REFERENCES project.wbs_groups(id) ON DELETE SET NULL,
    CONSTRAINT uk_epic_feature_name UNIQUE (epic_id, name)
);

CREATE INDEX IF NOT EXISTS idx_features_epic_id ON project.features(epic_id);
CREATE INDEX IF NOT EXISTS idx_features_wbs_group_id ON project.features(wbs_group_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON project.features(status);
CREATE INDEX IF NOT EXISTS idx_features_priority ON project.features(priority);

COMMENT ON TABLE project.features IS 'Feature - Second level in Backlog hierarchy (Epic -> Feature -> UserStory -> Task)';
COMMENT ON COLUMN project.features.status IS 'OPEN, IN_PROGRESS, DONE, CANCELLED';
COMMENT ON COLUMN project.features.priority IS 'CRITICAL, HIGH, MEDIUM, LOW';
COMMENT ON COLUMN project.features.wbs_group_id IS 'Reference to WBS Group for Feature-WbsGroup integration';


-- ============================================
-- 5. WBS Item - Story Linking Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_item_story_links (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wbs_item_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(50) NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    linked_by VARCHAR(36),
    CONSTRAINT fk_wis_link_wbs_item FOREIGN KEY (wbs_item_id)
        REFERENCES project.wbs_items(id) ON DELETE CASCADE,
    CONSTRAINT uk_wbs_item_story UNIQUE (wbs_item_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_wis_links_wbs_item_id ON project.wbs_item_story_links(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_wis_links_story_id ON project.wbs_item_story_links(story_id);

COMMENT ON TABLE project.wbs_item_story_links IS 'Links WBS Items to User Stories for WbsItem-Story integration';


-- ============================================
-- 6. Add phase_id to epics table for Epic-Phase integration
-- ============================================

ALTER TABLE project.epics
ADD COLUMN IF NOT EXISTS phase_id VARCHAR(50);

ALTER TABLE project.epics
ADD COLUMN IF NOT EXISTS color VARCHAR(20);

ALTER TABLE project.epics
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

ALTER TABLE project.epics
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'MEDIUM';

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_epic_phase'
        AND table_schema = 'project'
        AND table_name = 'epics'
    ) THEN
        ALTER TABLE project.epics
        ADD CONSTRAINT fk_epic_phase FOREIGN KEY (phase_id)
            REFERENCES project.phases(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_epics_phase_id ON project.epics(phase_id);

COMMENT ON COLUMN project.epics.phase_id IS 'Reference to Phase for Epic-Phase integration';
COMMENT ON COLUMN project.epics.color IS 'Color code for UI display (e.g., #3B82F6)';
COMMENT ON COLUMN project.epics.progress IS 'Epic completion percentage (0-100)';
COMMENT ON COLUMN project.epics.priority IS 'CRITICAL, HIGH, MEDIUM, LOW';


-- ============================================
-- 7. Add feature_id and wbs_item_id to user_stories table
-- ============================================

ALTER TABLE task.user_stories
ADD COLUMN IF NOT EXISTS feature_id VARCHAR(36);

ALTER TABLE task.user_stories
ADD COLUMN IF NOT EXISTS wbs_item_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_user_stories_feature_id ON task.user_stories(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_wbs_item_id ON task.user_stories(wbs_item_id);

COMMENT ON COLUMN task.user_stories.feature_id IS 'Reference to Feature for Feature-Story integration';
COMMENT ON COLUMN task.user_stories.wbs_item_id IS 'Reference to WBS Item for WbsItem-Story integration';
