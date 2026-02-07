-- Phase 1: Validate FK constraint (NOT VALID -> VALID)
ALTER TABLE task.user_stories VALIDATE CONSTRAINT fk_user_stories_epic_id;
