-- V20260234_03: Validate remaining FK constraints against existing data (Phase 4)
-- Previously validated FKs (skip):
--   fk_tasks_part_id            (validated in Phase 0 - V20260231_03)
--   fk_backlog_items_requirement_id  (validated in Phase 0 - V20260231_03)
--   fk_user_stories_epic_id     (validated in Phase 1 - V20260232_05)

-- Validate the 2 new FKs added in V20260234_02
ALTER TABLE task.user_stories VALIDATE CONSTRAINT fk_user_stories_part_id;
ALTER TABLE task.user_stories VALIDATE CONSTRAINT fk_user_stories_backlog_item_id;
