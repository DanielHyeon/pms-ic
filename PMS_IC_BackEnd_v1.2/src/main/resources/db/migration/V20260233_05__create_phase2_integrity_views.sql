-- Phase 2-4: Integrity monitoring views for Option A contract

-- [VIEW 1] story.backlog_item_id references non-existent backlog_items (must be 0)
CREATE OR REPLACE VIEW task.v_orphan_backlog_item_ref AS
SELECT us.id AS story_id, us.backlog_item_id
FROM task.user_stories us
WHERE us.backlog_item_id IS NOT NULL
  AND us.backlog_item_id NOT IN (SELECT id FROM project.backlog_items);

-- [VIEW 2] story has multiple requirement links (Option A violation, must be 0)
CREATE OR REPLACE VIEW task.v_multi_requirement_stories AS
SELECT user_story_id, COUNT(DISTINCT requirement_id) AS req_count
FROM task.user_story_requirement_links
GROUP BY user_story_id
HAVING COUNT(DISTINCT requirement_id) > 1;

-- [VIEW 3] backlog_items with duplicate requirement_id per backlog (must be 0)
CREATE OR REPLACE VIEW project.v_dup_backlog_requirement AS
SELECT backlog_id, requirement_id, COUNT(*) AS cnt
FROM project.backlog_items
WHERE requirement_id IS NOT NULL
GROUP BY backlog_id, requirement_id
HAVING COUNT(*) > 1;
