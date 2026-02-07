-- Phase 0-2: Copy rfp.requirements -> project.requirements (project-scoped snapshot)
-- Adds source_requirement_id column for origin tracking
-- Uses preq- prefix PK to avoid conflicts with rfp IDs

BEGIN;

-- Schema change: add source_requirement_id tracking column
ALTER TABLE project.requirements
ADD COLUMN IF NOT EXISTS source_requirement_id VARCHAR(36);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_req_source_unique
    ON project.requirements(project_id, source_requirement_id)
    WHERE source_requirement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_req_source_id
    ON project.requirements(source_requirement_id);

-- Pre-check: count copy targets
DO $$
DECLARE
    v_rfp_count INTEGER;
    v_existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_rfp_count
    FROM rfp.requirements r
    WHERE r.project_id IS NOT NULL;

    SELECT COUNT(*) INTO v_existing_count
    FROM project.requirements;

    RAISE NOTICE 'Phase 0-2: rfp.requirements to copy: %, project.requirements existing: %',
        v_rfp_count, v_existing_count;
END $$;

-- Copy data: separate PK (preq-) + source tracking
INSERT INTO project.requirements (
    id, rfp_id, project_id, source_requirement_id,
    requirement_code, title, description,
    category, priority, status, progress_percentage,
    tenant_id, created_by, created_at, updated_at
)
SELECT
    'preq-' || SUBSTRING(r.id FROM 5),  -- req-001-01 -> preq-001-01
    r.rfp_id,
    r.project_id,
    r.id,  -- source_requirement_id = original rfp.requirements.id
    'P-' || r.requirement_code,  -- prefix to ensure uniqueness vs rfp codes
    r.title,
    r.description,
    r.category,
    r.priority,
    CASE
        WHEN r.status = 'APPROVED' THEN 'APPROVED'
        WHEN r.status = 'ANALYZED' THEN 'ANALYZED'
        ELSE 'IDENTIFIED'
    END,
    COALESCE(r.progress, 0),
    rfps.tenant_id,
    'system',
    r.created_at,
    r.updated_at
FROM rfp.requirements r
JOIN rfp.rfps rfps ON r.rfp_id = rfps.id
WHERE r.project_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;  -- divergeable copy: don't overwrite existing

-- Update backlog_items.requirement_id: rfp ID -> project snapshot ID
UPDATE project.backlog_items bi
SET requirement_id = pr.id,
    updated_at = NOW()
FROM project.requirements pr
WHERE pr.source_requirement_id = bi.requirement_id
  AND bi.requirement_id NOT LIKE 'preq-%';  -- skip already converted

-- Post-check
DO $$
DECLARE
    v_total_bi INTEGER;
    v_linked_bi INTEGER;
    v_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_bi FROM project.backlog_items;
    SELECT COUNT(*) INTO v_linked_bi
    FROM project.backlog_items bi
    JOIN project.requirements r ON bi.requirement_id = r.id;

    SELECT COUNT(*) INTO v_orphans
    FROM project.backlog_items bi
    WHERE bi.requirement_id IS NOT NULL
      AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

    IF v_orphans > 0 THEN
        RAISE EXCEPTION 'Phase 0-2 post-check failed: % orphan requirement_id(s) remain — ROLLBACK', v_orphans;
    END IF;

    RAISE NOTICE 'Phase 0-2 complete: backlog_items %/% linked, 0 orphans',
        v_linked_bi, v_total_bi;
END $$;

COMMIT;
