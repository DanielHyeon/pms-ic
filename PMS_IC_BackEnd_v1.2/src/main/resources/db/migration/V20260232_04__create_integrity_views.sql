-- Phase 1-3: Create integrity monitoring views (Orphan + Mismatch detection)

-- [VIEW 1] Orphan part references in tasks and user_stories (must be 0)
CREATE OR REPLACE VIEW task.v_orphan_part_ref AS
SELECT t.id, t.title, t.part_id, 'task.tasks' AS source_table
FROM task.tasks t
WHERE t.part_id IS NOT NULL
  AND t.part_id NOT IN (SELECT id FROM project.parts)
UNION ALL
SELECT us.id, us.title, us.part_id, 'task.user_stories' AS source_table
FROM task.user_stories us
WHERE us.part_id IS NOT NULL
  AND us.part_id NOT IN (SELECT id FROM project.parts);

-- [VIEW 2] Orphan epic references in user_stories (must be 0)
CREATE OR REPLACE VIEW task.v_orphan_epic_ref AS
SELECT us.id, us.title, us.epic_id, us.epic AS epic_text
FROM task.user_stories us
WHERE us.epic_id IS NOT NULL
  AND us.epic_id NOT IN (SELECT id FROM project.epics);

-- [VIEW 3] Orphan requirement references in backlog_items (must be 0)
CREATE OR REPLACE VIEW project.v_orphan_requirement_ref AS
SELECT bi.id, bi.requirement_id, bi.status
FROM project.backlog_items bi
WHERE bi.requirement_id IS NOT NULL
  AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

-- [VIEW 4] Story.part_id vs Feature.part_id mismatch (must be 0)
-- story.part_id is derived from feature.part_id; mismatch = sync broken
CREATE OR REPLACE VIEW task.v_mismatch_story_feature_part AS
SELECT
    us.id AS story_id,
    us.title AS story_title,
    us.feature_id,
    us.part_id AS story_part,
    f.part_id AS feature_part
FROM task.user_stories us
JOIN project.features f ON us.feature_id = f.id
WHERE us.part_id IS DISTINCT FROM f.part_id;

-- [VIEW 5] Epic ID assigned but epic TEXT doesn't match (must be 0)
CREATE OR REPLACE VIEW task.v_mismatch_story_epic_text AS
SELECT
    us.id AS story_id,
    us.title AS story_title,
    us.epic_id,
    us.epic AS epic_text,
    e.name AS epic_name
FROM task.user_stories us
JOIN project.epics e ON us.epic_id = e.id
WHERE us.epic IS DISTINCT FROM e.name;
