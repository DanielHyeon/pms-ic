-- V20260234_02: Add remaining FK constraints with NOT VALID (Phase 4)
-- NOT VALID skips existing data validation (minimizes lock time)
-- New INSERT/UPDATE enforced immediately
--
-- NOTE: The following FKs already exist from earlier phases:
--   fk_tasks_part_id            (Phase 0 - V20260231_03)
--   fk_backlog_items_requirement_id  (Phase 0 - V20260231_03)
--   fk_user_stories_epic_id     (Phase 1 - V20260232_01)
-- This migration only adds the 2 remaining FKs.

BEGIN;

-- FK: task.user_stories.part_id -> project.parts.id
ALTER TABLE task.user_stories
ADD CONSTRAINT fk_user_stories_part_id
    FOREIGN KEY (part_id) REFERENCES project.parts(id)
    ON DELETE SET NULL
    NOT VALID;

-- FK: task.user_stories.backlog_item_id -> project.backlog_items.id
ALTER TABLE task.user_stories
ADD CONSTRAINT fk_user_stories_backlog_item_id
    FOREIGN KEY (backlog_item_id) REFERENCES project.backlog_items(id)
    ON DELETE SET NULL
    NOT VALID;

COMMIT;
