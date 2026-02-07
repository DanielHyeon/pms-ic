-- Phase 1 CI gate: Orphan + Mismatch checks (all must be 0)
DO $$
DECLARE
    orphan_parts     INTEGER;
    orphan_epics     INTEGER;
    orphan_reqs      INTEGER;
    mismatch_parts   INTEGER;
    mismatch_epics   INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_parts  FROM task.v_orphan_part_ref;
    SELECT COUNT(*) INTO orphan_epics  FROM task.v_orphan_epic_ref;
    SELECT COUNT(*) INTO orphan_reqs   FROM project.v_orphan_requirement_ref;
    SELECT COUNT(*) INTO mismatch_parts FROM task.v_mismatch_story_feature_part;
    SELECT COUNT(*) INTO mismatch_epics FROM task.v_mismatch_story_epic_text;

    IF orphan_parts > 0 OR orphan_epics > 0 OR orphan_reqs > 0 THEN
        RAISE EXCEPTION
            '[Phase1 CI] Orphan detected: parts=%, epics=%, reqs=%',
            orphan_parts, orphan_epics, orphan_reqs;
    END IF;

    IF mismatch_parts > 0 OR mismatch_epics > 0 THEN
        RAISE EXCEPTION
            '[Phase1 CI] Mismatch detected: story-feature part=%, story-epic text=%',
            mismatch_parts, mismatch_epics;
    END IF;

    RAISE NOTICE '[Phase1 CI] All integrity checks passed.';
END $$;
