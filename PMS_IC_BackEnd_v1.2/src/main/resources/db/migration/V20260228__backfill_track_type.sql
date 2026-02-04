-- Backfill track_type where NULL using name-pattern logic
-- After this migration, phases.track_type will be NOT NULL with DEFAULT 'COMMON'

-- Step 1: Backfill using current name-pattern logic
UPDATE project.phases SET track_type = 'AI'
WHERE track_type IS NULL
  AND (name LIKE '%AI%' OR name LIKE '%모델%' OR name LIKE '%OCR%');

UPDATE project.phases SET track_type = 'SI'
WHERE track_type IS NULL
  AND (name LIKE '%SI%' OR name LIKE '%연동%' OR name LIKE '%레거시%'
       OR name LIKE '%마이그레이션%');

UPDATE project.phases SET track_type = 'COMMON'
WHERE track_type IS NULL;

-- Step 2: Add NOT NULL constraint to prevent future nulls
ALTER TABLE project.phases ALTER COLUMN track_type SET NOT NULL;
ALTER TABLE project.phases ALTER COLUMN track_type SET DEFAULT 'COMMON';
