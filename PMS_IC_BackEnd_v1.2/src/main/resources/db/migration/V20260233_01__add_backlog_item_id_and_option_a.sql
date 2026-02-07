-- Phase 2-1: Story ↔ BacklogItem link (Option A) + requirement link migration

BEGIN;

-- ========================================
-- Pre-check: Option A preconditions
-- ========================================
DO $$
DECLARE
    dup_req_cnt INTEGER;
    multi_link_cnt INTEGER;
BEGIN
    -- backlog_items: requirement_id must be unique per backlog
    SELECT COUNT(*) INTO dup_req_cnt
    FROM (
        SELECT bi.backlog_id, bi.requirement_id
        FROM project.backlog_items bi
        WHERE bi.requirement_id IS NOT NULL
        GROUP BY bi.backlog_id, bi.requirement_id
        HAVING COUNT(*) > 1
    ) sub;

    -- story_requirement_links: each story must link to at most 1 requirement
    SELECT COUNT(*) INTO multi_link_cnt
    FROM (
        SELECT user_story_id
        FROM task.user_story_requirement_links
        GROUP BY user_story_id
        HAVING COUNT(DISTINCT requirement_id) > 1
    ) sub;

    IF dup_req_cnt > 0 THEN
        RAISE EXCEPTION '[Phase2-1] backlog_items has % duplicate requirement_id(s) per backlog', dup_req_cnt;
    END IF;
    IF multi_link_cnt > 0 THEN
        RAISE EXCEPTION '[Phase2-1] % stories have multiple requirement links', multi_link_cnt;
    END IF;

    RAISE NOTICE '[Phase2-1] Option A preconditions met.';
END $$;

-- ========================================
-- Step 1: Migrate user_story_requirement_links to project.requirements IDs
-- (currently links use rfp.requirements IDs like req-001-01;
--  need to point to project.requirements IDs like preq-001-01)
-- ========================================
UPDATE task.user_story_requirement_links usrl
SET requirement_id = r.id
FROM project.requirements r
WHERE r.source_requirement_id = usrl.requirement_id
  AND usrl.requirement_id NOT LIKE 'preq-%';

-- ========================================
-- Step 2: Add backlog_item_id column
-- ========================================
ALTER TABLE task.user_stories
ADD COLUMN IF NOT EXISTS backlog_item_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_user_stories_backlog_item_id
    ON task.user_stories(backlog_item_id);

-- ========================================
-- Step 3: Map story ↔ backlog_item via requirement_id
-- (now both link table and backlog_items use project.requirements IDs)
-- ========================================
UPDATE task.user_stories us
SET backlog_item_id = bi.id,
    updated_at = NOW()
FROM task.user_story_requirement_links usrl
JOIN project.backlog_items bi
    ON bi.requirement_id = usrl.requirement_id
WHERE us.id = usrl.user_story_id
  AND us.backlog_item_id IS NULL;

-- ========================================
-- Step 4: Option A contracts (unique indexes)
-- ========================================

-- (a) backlog_items: requirement_id unique per backlog
CREATE UNIQUE INDEX IF NOT EXISTS uq_backlog_items_backlog_requirement
    ON project.backlog_items(backlog_id, requirement_id)
    WHERE requirement_id IS NOT NULL;

-- (b) story_requirement_links: one requirement per story
CREATE UNIQUE INDEX IF NOT EXISTS uq_story_requirement_one
    ON task.user_story_requirement_links(user_story_id);

-- ========================================
-- Post-check
-- ========================================
DO $$
DECLARE
    linked_cnt INTEGER;
    total_cnt INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(backlog_item_id)
    INTO total_cnt, linked_cnt
    FROM task.user_stories;

    RAISE NOTICE '[Phase2-1] Mapping complete: %/% stories linked to backlog_items',
        linked_cnt, total_cnt;

    IF linked_cnt < 4 THEN
        RAISE EXCEPTION '[Phase2-1] Expected >= 4 linked stories, found %', linked_cnt;
    END IF;
END $$;

COMMIT;
