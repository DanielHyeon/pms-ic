-- Phase 2 CI gate: Option A contract + orphan checks (all must be 0)
DO $$
DECLARE
    orphan_bi      INTEGER;
    multi_req      INTEGER;
    dup_req        INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_bi   FROM task.v_orphan_backlog_item_ref;
    SELECT COUNT(*) INTO multi_req   FROM task.v_multi_requirement_stories;
    SELECT COUNT(*) INTO dup_req     FROM project.v_dup_backlog_requirement;

    IF orphan_bi > 0 THEN
        RAISE EXCEPTION '[Phase2 CI] % stories reference non-existent backlog_items', orphan_bi;
    END IF;
    IF multi_req > 0 THEN
        RAISE EXCEPTION '[Phase2 CI] % stories have multiple requirement links (Option A violation)', multi_req;
    END IF;
    IF dup_req > 0 THEN
        RAISE EXCEPTION '[Phase2 CI] % backlog_items have duplicate requirement_id per backlog', dup_req;
    END IF;

    RAISE NOTICE '[Phase2 CI] All integrity checks passed.';
END $$;
