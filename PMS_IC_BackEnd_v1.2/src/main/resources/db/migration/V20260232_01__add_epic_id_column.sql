-- Phase 1-1: Add epic_id column + index + FK (NOT VALID, ON DELETE RESTRICT)

ALTER TABLE task.user_stories
ADD COLUMN IF NOT EXISTS epic_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_user_stories_epic_id
    ON task.user_stories(epic_id);

-- FK: ON DELETE RESTRICT — Epic deletion blocked to protect KPI integrity
-- Use soft delete (archived_at) instead of hard DELETE
ALTER TABLE task.user_stories
ADD CONSTRAINT fk_user_stories_epic_id
    FOREIGN KEY (epic_id) REFERENCES project.epics(id)
    ON DELETE RESTRICT
    NOT VALID;
