-- ============================================================================
-- V20260203: Add project_id to outbox_events for tenant-aware activity filtering
-- ============================================================================

-- Add project_id column for efficient activity filtering by project
ALTER TABLE project.outbox_events
ADD COLUMN IF NOT EXISTS project_id VARCHAR(50);

-- Create composite index for project-based queries ordered by time
CREATE INDEX IF NOT EXISTS idx_outbox_events_project_created
ON project.outbox_events(project_id, created_at DESC);

-- Backfill existing events from payload JSON (PostgreSQL JSONB extraction)
UPDATE project.outbox_events
SET project_id = payload->>'projectId'
WHERE project_id IS NULL AND payload->>'projectId' IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN project.outbox_events.project_id IS 'Project ID for tenant-aware activity filtering';
