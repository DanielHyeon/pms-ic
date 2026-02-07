-- ci_data_quality_check.sql
-- CI Data Quality Gate: HARD 9 checks + SOFT 2 warnings
-- Runs after schema.sql + migrations + data.sql loading
-- Any HARD FAIL = build failure; SOFT WARNING = log only

DO $$
DECLARE
    -- Phase 1 orphan (referential integrity)
    v_orphan_parts       INTEGER;
    v_orphan_epics       INTEGER;
    v_orphan_reqs        INTEGER;

    -- Phase 1 mismatch (contract violation)
    v_mismatch_parts     INTEGER;
    v_mismatch_epics     INTEGER;

    -- Phase 1 contract: feature -> part derivation rule
    v_feature_no_part    INTEGER;

    -- Phase 2 Option A uniqueness rules
    v_dup_backlog_req    INTEGER;
    v_dup_story_req      INTEGER;
    v_invalid_backlog_ref INTEGER;

    -- Soft warning metrics
    v_null_epic_rate     NUMERIC;
    v_null_part_rate     NUMERIC;
BEGIN
    -- ============================================================
    -- HARD FAIL Group 1: Referential integrity (Phase 0~1 VIEWs)
    -- ============================================================
    SELECT COUNT(*) INTO v_orphan_parts  FROM task.v_orphan_part_ref;
    SELECT COUNT(*) INTO v_orphan_epics  FROM task.v_orphan_epic_ref;
    SELECT COUNT(*) INTO v_orphan_reqs   FROM project.v_orphan_requirement_ref;

    IF v_orphan_parts + v_orphan_epics + v_orphan_reqs > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [Referential Integrity]: orphan_parts=%, orphan_epics=%, orphan_reqs=%',
            v_orphan_parts, v_orphan_epics, v_orphan_reqs;
    END IF;

    -- ============================================================
    -- HARD FAIL Group 2: Contract violation (Phase 1 mismatch)
    -- ============================================================
    SELECT COUNT(*) INTO v_mismatch_parts FROM task.v_mismatch_story_feature_part;
    SELECT COUNT(*) INTO v_mismatch_epics FROM task.v_mismatch_story_epic_text;

    IF v_mismatch_parts + v_mismatch_epics > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [Contract Violation]: mismatch_parts=%, mismatch_epics=%',
            v_mismatch_parts, v_mismatch_epics;
    END IF;

    -- ============================================================
    -- HARD FAIL Group 3: Feature-part derivation rule (Phase 1)
    -- Stories with feature_id but missing part_id
    -- ============================================================
    SELECT COUNT(*) INTO v_feature_no_part
    FROM task.user_stories
    WHERE feature_id IS NOT NULL AND part_id IS NULL;

    IF v_feature_no_part > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [Derivation Rule]: % stories with feature_id but no part_id',
            v_feature_no_part;
    END IF;

    -- ============================================================
    -- HARD FAIL Group 4: Option A uniqueness rules (Phase 2)
    -- ============================================================

    -- 4a. backlog_items: (backlog_id, requirement_id) duplicates
    SELECT COUNT(*) INTO v_dup_backlog_req
    FROM (
        SELECT backlog_id, requirement_id, COUNT(*) AS cnt
        FROM project.backlog_items
        WHERE requirement_id IS NOT NULL
        GROUP BY backlog_id, requirement_id
        HAVING COUNT(*) > 1
    ) dupes;

    -- 4b. user_story_requirement_links: > 1 requirement per story
    SELECT COUNT(*) INTO v_dup_story_req
    FROM (
        SELECT user_story_id, COUNT(*) AS cnt
        FROM task.user_story_requirement_links
        GROUP BY user_story_id
        HAVING COUNT(*) > 1
    ) dupes;

    -- 4c. user_stories.backlog_item_id must reference existing backlog_items
    SELECT COUNT(*) INTO v_invalid_backlog_ref
    FROM task.user_stories us
    LEFT JOIN project.backlog_items bi ON us.backlog_item_id = bi.id
    WHERE us.backlog_item_id IS NOT NULL AND bi.id IS NULL;

    IF v_dup_backlog_req + v_dup_story_req + v_invalid_backlog_ref > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [Option A Violation]: dup_backlog_req=%, dup_story_req=%, invalid_backlog_ref=%',
            v_dup_backlog_req, v_dup_story_req, v_invalid_backlog_ref;
    END IF;

    -- ============================================================
    -- SOFT WARNING: NULL rates (build passes, log warning only)
    -- Thresholds: epic_id > 20%, part_id > 30% (stabilization phase)
    -- ============================================================
    SELECT ROUND(100.0 * COUNT(CASE WHEN epic_id IS NULL THEN 1 END)
           / NULLIF(COUNT(*), 0), 1)
    INTO v_null_epic_rate
    FROM task.user_stories;

    SELECT ROUND(100.0 * COUNT(CASE WHEN part_id IS NULL THEN 1 END)
           / NULLIF(COUNT(*), 0), 1)
    INTO v_null_part_rate
    FROM task.user_stories;

    IF v_null_epic_rate > 20 THEN
        RAISE WARNING 'SOFT WARNING: epic_id NULL rate = %%% (threshold: 20%%)',
            v_null_epic_rate;
    END IF;

    IF v_null_part_rate > 30 THEN
        RAISE WARNING 'SOFT WARNING: part_id NULL rate = %%% (threshold: 30%%)',
            v_null_part_rate;
    END IF;

    -- ============================================================
    -- Final result
    -- ============================================================
    RAISE NOTICE 'DATA QUALITY GATE PASSED';
    RAISE NOTICE '  orphan(p=%,e=%,r=%) mismatch(p=%,e=%) feature_no_part=%',
        v_orphan_parts, v_orphan_epics, v_orphan_reqs,
        v_mismatch_parts, v_mismatch_epics, v_feature_no_part;
    RAISE NOTICE '  optionA(dup_bl=%,dup_sr=%,inv_bl=%) epic_null=%%% part_null=%%%',
        v_dup_backlog_req, v_dup_story_req, v_invalid_backlog_ref,
        v_null_epic_rate, v_null_part_rate;
END $$;
