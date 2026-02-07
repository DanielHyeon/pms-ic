-- Phase 1-2: Derive story.part_id from feature.part_id

BEGIN;

-- Pre-check: verify feature-story relationships
DO $$
DECLARE
    stories_with_feature INTEGER;
    features_with_part INTEGER;
BEGIN
    SELECT COUNT(*) INTO stories_with_feature
    FROM task.user_stories WHERE feature_id IS NOT NULL;

    SELECT COUNT(DISTINCT f.id) INTO features_with_part
    FROM task.user_stories us
    JOIN project.features f ON us.feature_id = f.id
    WHERE f.part_id IS NOT NULL;

    RAISE NOTICE '[Phase1-2] Stories with feature: %, Features with part: %',
        stories_with_feature, features_with_part;
END $$;

-- Derive: feature.part_id -> story.part_id
UPDATE task.user_stories us
SET part_id = f.part_id,
    updated_at = NOW()
FROM project.features f
WHERE us.feature_id = f.id
  AND f.part_id IS NOT NULL
  AND us.part_id IS NULL;

-- Post-check: stories with feature but no part_id must be 0
DO $$
DECLARE
    feature_but_no_part INTEGER;
BEGIN
    SELECT COUNT(*) INTO feature_but_no_part
    FROM task.user_stories us
    JOIN project.features f ON us.feature_id = f.id
    WHERE f.part_id IS NOT NULL
      AND us.part_id IS NULL;

    IF feature_but_no_part > 0 THEN
        RAISE EXCEPTION '[Phase1-2] % stories have feature with part but story.part_id is NULL',
            feature_but_no_part;
    END IF;

    RAISE NOTICE '[Phase1-2] All stories with features now have derived part_id';
END $$;

COMMIT;
