-- Phase 1-1: Map epic_id data for existing stories (seed-scope, ID-based)

BEGIN;

-- Pre-check: verify stories and epics exist
DO $$
DECLARE
    story_cnt INTEGER;
    epic_cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO story_cnt
    FROM task.user_stories
    WHERE id IN ('story-001-01','story-001-02','story-001-03','story-001-04','story-002-01');

    SELECT COUNT(*) INTO epic_cnt
    FROM project.epics
    WHERE id IN ('epic-001-01','epic-001-02','epic-001-03','epic-001-04');

    IF story_cnt < 5 THEN
        RAISE EXCEPTION '[Phase1-1] Expected 5 stories, found %', story_cnt;
    END IF;
    IF epic_cnt < 4 THEN
        RAISE EXCEPTION '[Phase1-1] Expected 4 epics, found %', epic_cnt;
    END IF;
END $$;

-- Map epic_id based on project_id + story ID
UPDATE task.user_stories SET epic_id = 'epic-001-01'
WHERE project_id = 'proj-001' AND id = 'story-001-01';

UPDATE task.user_stories SET epic_id = 'epic-001-02'
WHERE project_id = 'proj-001' AND id = 'story-001-02';

UPDATE task.user_stories SET epic_id = 'epic-001-03'
WHERE project_id = 'proj-001' AND id = 'story-001-03';

UPDATE task.user_stories SET epic_id = 'epic-001-04'
WHERE project_id = 'proj-001' AND id = 'story-001-04';

-- story-002-01 'Research': intentionally unclassified (NULL)
-- No matching epic in proj-002, will be classified later

-- Sync epic TEXT column with actual Epic entity names
UPDATE task.user_stories us
SET epic = e.name
FROM project.epics e
WHERE us.epic_id = e.id
  AND us.epic_id IS NOT NULL;

-- Post-check
DO $$
DECLARE
    mapped_cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapped_cnt
    FROM task.user_stories
    WHERE epic_id IS NOT NULL;

    IF mapped_cnt < 4 THEN
        RAISE EXCEPTION '[Phase1-1] Expected >= 4 mapped stories, found %', mapped_cnt;
    END IF;

    RAISE NOTICE '[Phase1-1] % stories mapped with epic_id', mapped_cnt;
END $$;

COMMIT;
