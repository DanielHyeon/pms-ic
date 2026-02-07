-- Phase 0 CI gate: any failure = deployment blocked
DO $$
DECLARE
    v_orphan_parts INTEGER;
    v_orphan_reqs INTEGER;
    v_part_join_count INTEGER;
    v_req_join_count INTEGER;
    v_project_req_count INTEGER;
BEGIN
    -- 1. Orphan part_id in task.tasks
    SELECT COUNT(*) INTO v_orphan_parts
    FROM task.tasks t
    WHERE t.part_id IS NOT NULL
      AND t.part_id NOT IN (SELECT id FROM project.parts);

    -- 2. Orphan requirement_id in backlog_items
    SELECT COUNT(*) INTO v_orphan_reqs
    FROM project.backlog_items bi
    WHERE bi.requirement_id IS NOT NULL
      AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

    -- 3. Part JOIN works
    SELECT COUNT(*) INTO v_part_join_count
    FROM task.tasks t
    JOIN project.parts p ON t.part_id = p.id;

    -- 4. Requirement JOIN works
    SELECT COUNT(*) INTO v_req_join_count
    FROM project.backlog_items bi
    JOIN project.requirements r ON bi.requirement_id = r.id;

    -- 5. project.requirements not empty
    SELECT COUNT(*) INTO v_project_req_count
    FROM project.requirements;

    -- HARD FAIL conditions
    IF v_orphan_parts > 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: orphan part_id count=%', v_orphan_parts;
    END IF;

    IF v_orphan_reqs > 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: orphan requirement_id count=%', v_orphan_reqs;
    END IF;

    IF v_part_join_count = 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: Part JOIN returns 0 rows';
    END IF;

    IF v_req_join_count = 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: Requirement JOIN returns 0 rows';
    END IF;

    IF v_project_req_count = 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: project.requirements is empty';
    END IF;

    RAISE NOTICE 'PHASE 0 GATE PASSED: orphan_parts=%, orphan_reqs=%, part_joins=%, req_joins=%, project_reqs=%',
        v_orphan_parts, v_orphan_reqs, v_part_join_count, v_req_join_count, v_project_req_count;
END $$;
