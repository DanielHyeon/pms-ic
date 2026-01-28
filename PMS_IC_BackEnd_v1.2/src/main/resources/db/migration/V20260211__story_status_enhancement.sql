-- Story Status Enhancement Migration
-- Version: 20260211
-- Description: Update UserStory status values to match Scrum design document
-- Status flow: IDEA -> REFINED -> READY -> IN_SPRINT -> IN_PROGRESS -> REVIEW -> DONE

-- ============================================
-- 1. Migrate existing status values
-- ============================================

-- BACKLOG -> READY (stories that were in backlog are now "ready" for sprint planning)
UPDATE task.user_stories
SET status = 'READY', updated_at = CURRENT_TIMESTAMP
WHERE status = 'BACKLOG';

-- SELECTED -> IN_SPRINT (stories selected for sprint are now "in sprint")
UPDATE task.user_stories
SET status = 'IN_SPRINT', updated_at = CURRENT_TIMESTAMP
WHERE status = 'SELECTED';

-- COMPLETED -> DONE (completed stories are now "done")
UPDATE task.user_stories
SET status = 'DONE', updated_at = CURRENT_TIMESTAMP
WHERE status = 'COMPLETED';

-- ============================================
-- 2. Add comment for documentation
-- ============================================

COMMENT ON COLUMN task.user_stories.status IS
'Story status following Scrum design: IDEA (initial), REFINED (detailed), READY (sprint-ready), IN_SPRINT (committed), IN_PROGRESS (active), REVIEW (QA), DONE (complete), CANCELLED';
