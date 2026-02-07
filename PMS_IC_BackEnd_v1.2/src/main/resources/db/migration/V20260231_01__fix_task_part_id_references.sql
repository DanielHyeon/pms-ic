-- Phase 0-1: Fix broken task.tasks.part_id references
-- Maps incorrect part IDs to actual project.parts IDs
-- Safety: project scope + explicit task IDs to limit scope

BEGIN;

-- Pre-check: log affected rows
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM task.tasks
    WHERE part_id IN ('part-001-01','part-001-02','part-001-03','part-002-01','part-002-03');

    IF v_count = 0 THEN
        RAISE NOTICE 'Phase 0-1: 0 rows to fix — already corrected or no data';
    ELSIF v_count > 15 THEN
        RAISE EXCEPTION 'Phase 0-1: Expected ~12 rows but found % — manual check required', v_count;
    ELSE
        RAISE NOTICE 'Phase 0-1: % rows to fix', v_count;
    END IF;
END $$;

-- Project 1: AI Part (part-001-01 -> part-001-ai)
UPDATE task.tasks
SET part_id = 'part-001-ai', updated_at = NOW()
WHERE project_id = 'proj-001'
  AND part_id = 'part-001-01'
  AND id IN ('task-001-08', 'task-001-09', 'task-001-10');

-- Project 1: SI Part (part-001-02 -> part-001-si)
UPDATE task.tasks
SET part_id = 'part-001-si', updated_at = NOW()
WHERE project_id = 'proj-001'
  AND part_id = 'part-001-02'
  AND id IN ('task-001-04', 'task-001-05', 'task-001-06', 'task-001-11', 'task-001-12');

-- Project 1: Common Part (part-001-03 -> part-001-common)
UPDATE task.tasks
SET part_id = 'part-001-common', updated_at = NOW()
WHERE project_id = 'proj-001'
  AND part_id = 'part-001-03'
  AND id = 'task-001-07';

-- Project 2: UX Part (part-002-01 -> part-002-ux)
UPDATE task.tasks
SET part_id = 'part-002-ux', updated_at = NOW()
WHERE project_id = 'proj-002'
  AND part_id = 'part-002-01'
  AND id IN ('task-002-06', 'task-002-07');

-- Project 2: Mobile Part (part-002-03 -> part-002-mobile)
UPDATE task.tasks
SET part_id = 'part-002-mobile', updated_at = NOW()
WHERE project_id = 'proj-002'
  AND part_id = 'part-002-03'
  AND id = 'task-002-08';

-- Post-check: ensure no orphan references remain
DO $$
DECLARE
    v_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orphans
    FROM task.tasks t
    WHERE t.part_id IS NOT NULL
      AND t.part_id NOT IN (SELECT id FROM project.parts);

    IF v_orphans > 0 THEN
        RAISE EXCEPTION 'Phase 0-1 post-check failed: % orphan part_id(s) remain — ROLLBACK', v_orphans;
    END IF;

    RAISE NOTICE 'Phase 0-1 complete: 0 orphan references confirmed';
END $$;

COMMIT;
