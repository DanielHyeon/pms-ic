-- V20260234_01: Add missing indexes for FK target columns (Phase 4)
-- idx_user_stories_epic_id already exists from Phase 1 — IF NOT EXISTS is safe
-- These indexes prevent full table scans on parent DELETE/UPDATE

CREATE INDEX IF NOT EXISTS idx_user_stories_epic_id
    ON task.user_stories(epic_id);

CREATE INDEX IF NOT EXISTS idx_backlog_items_requirement_id
    ON project.backlog_items(requirement_id);

CREATE INDEX IF NOT EXISTS idx_user_stories_backlog_item_id
    ON task.user_stories(backlog_item_id);
