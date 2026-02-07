-- Phase 0-3: Add FK constraints on corrected references
-- Order: NOT VALID first (fast, no full scan) -> VALIDATE (verify existing data)

BEGIN;

-- Pre-check: ensure no orphans remain before adding FKs
DO $$
DECLARE
    v_orphan_parts INTEGER;
    v_orphan_reqs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orphan_parts
    FROM task.tasks t
    WHERE t.part_id IS NOT NULL
      AND t.part_id NOT IN (SELECT id FROM project.parts);

    SELECT COUNT(*) INTO v_orphan_reqs
    FROM project.backlog_items bi
    WHERE bi.requirement_id IS NOT NULL
      AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

    IF v_orphan_parts > 0 THEN
        RAISE EXCEPTION 'Cannot add FK: task.tasks has % orphan part_id(s)', v_orphan_parts;
    END IF;

    IF v_orphan_reqs > 0 THEN
        RAISE EXCEPTION 'Cannot add FK: backlog_items has % orphan requirement_id(s)', v_orphan_reqs;
    END IF;

    RAISE NOTICE 'Phase 0-3: 0 orphan references confirmed, proceeding with FK addition';
END $$;

-- FK 1: task.tasks.part_id -> project.parts.id (SET NULL on delete)
ALTER TABLE task.tasks
ADD CONSTRAINT fk_tasks_part_id
    FOREIGN KEY (part_id) REFERENCES project.parts(id)
    ON DELETE SET NULL
    NOT VALID;

-- FK 2: backlog_items.requirement_id -> project.requirements.id (SET NULL on delete)
ALTER TABLE project.backlog_items
ADD CONSTRAINT fk_backlog_items_requirement_id
    FOREIGN KEY (requirement_id) REFERENCES project.requirements(id)
    ON DELETE SET NULL
    NOT VALID;

COMMIT;

-- VALIDATE: verify existing data (separate transactions)
ALTER TABLE task.tasks VALIDATE CONSTRAINT fk_tasks_part_id;
ALTER TABLE project.backlog_items VALIDATE CONSTRAINT fk_backlog_items_requirement_id;
