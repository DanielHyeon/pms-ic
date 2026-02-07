-- Phase 2-3: Status normalization + transition event seeding
-- Principle: seed event FIRST, then change status (preserves history)

-- ========================================
-- User Story: COMPLETED → DONE, SELECTED → IN_SPRINT
-- ========================================
BEGIN;

INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    us.project_id,
    'STORY',
    us.id,
    us.status,
    CASE
        WHEN us.status = 'COMPLETED' THEN 'DONE'
        WHEN us.status = 'SELECTED'  THEN 'IN_SPRINT'
        ELSE us.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM task.user_stories us
WHERE us.status IN ('COMPLETED', 'SELECTED');

UPDATE task.user_stories SET status = 'DONE'      WHERE status = 'COMPLETED';
UPDATE task.user_stories SET status = 'IN_SPRINT'  WHERE status = 'SELECTED';

COMMIT;

-- ========================================
-- Epic: ACTIVE → IN_PROGRESS, DRAFT → BACKLOG
-- ========================================
BEGIN;

INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    e.project_id,
    'EPIC',
    e.id,
    e.status,
    CASE
        WHEN e.status = 'ACTIVE' THEN 'IN_PROGRESS'
        WHEN e.status = 'DRAFT'  THEN 'BACKLOG'
        ELSE e.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM project.epics e
WHERE e.status IN ('ACTIVE', 'DRAFT');

UPDATE project.epics SET status = 'IN_PROGRESS' WHERE status = 'ACTIVE';
UPDATE project.epics SET status = 'BACKLOG'     WHERE status = 'DRAFT';

COMMIT;

-- ========================================
-- Backlog Item: SELECTED → IN_SPRINT
-- ========================================
BEGIN;

INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    (SELECT b.project_id FROM project.backlogs b WHERE b.id = bi.backlog_id),
    'BACKLOG_ITEM',
    bi.id,
    bi.status,
    CASE
        WHEN bi.status = 'SELECTED' THEN 'IN_SPRINT'
        ELSE bi.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM project.backlog_items bi
WHERE bi.status IN ('SELECTED');

UPDATE project.backlog_items SET status = 'IN_SPRINT' WHERE status = 'SELECTED';

COMMIT;
