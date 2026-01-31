-- V20260219__deliverable_outbox_dead_letter.sql
-- Create Dead Letter table for failed RAG indexing events

CREATE TABLE IF NOT EXISTS project.deliverable_outbox_dead_letter (
    -- Original outbox event ID
    id VARCHAR(50) PRIMARY KEY,

    -- Event identification (preserved from original)
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,

    -- Event payload (preserved from original)
    payload JSONB NOT NULL,

    -- Redis Streams ID (Phase 3)
    stream_id VARCHAR(50),

    -- Error history (JSON array of all failures)
    error_history JSONB,

    -- Total delivery attempts
    delivery_count INT,

    -- Original creation timestamp
    created_at TIMESTAMP,

    -- Dead letter move timestamp
    moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Project scope
    project_id VARCHAR(50),

    -- Resolution status
    resolution_status VARCHAR(50) DEFAULT 'UNRESOLVED',
    -- UNRESOLVED: Not yet addressed
    -- RETRYING: Manual retry in progress
    -- RESOLVED: Successfully reprocessed
    -- IGNORED: Marked as not needed

    resolution_notes TEXT,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_dl_resolution_status
        CHECK (resolution_status IN ('UNRESOLVED', 'RETRYING', 'RESOLVED', 'IGNORED'))
);

-- Indexes for Dead Letter management

-- 1. Unresolved events (primary monitoring query)
CREATE INDEX IF NOT EXISTS idx_dl_unresolved
    ON project.deliverable_outbox_dead_letter(resolution_status, moved_at)
    WHERE resolution_status = 'UNRESOLVED';

-- 2. Aggregate lookup
CREATE INDEX IF NOT EXISTS idx_dl_aggregate
    ON project.deliverable_outbox_dead_letter(aggregate_type, aggregate_id);

-- 3. Event type lookup
CREATE INDEX IF NOT EXISTS idx_dl_event_type
    ON project.deliverable_outbox_dead_letter(event_type);

-- 4. Project-scoped query
CREATE INDEX IF NOT EXISTS idx_dl_project
    ON project.deliverable_outbox_dead_letter(project_id, moved_at DESC);

-- 5. Moved timestamp (for reporting/cleanup)
CREATE INDEX IF NOT EXISTS idx_dl_moved_at
    ON project.deliverable_outbox_dead_letter(moved_at);

-- Table and column comments
COMMENT ON TABLE project.deliverable_outbox_dead_letter IS
'Dead Letter table for RAG indexing events that exceeded max retries. Supports manual resolution workflow.';

COMMENT ON COLUMN project.deliverable_outbox_dead_letter.error_history IS 'JSON array of all error records: [{"error": "...", "at": "timestamp"}, ...]';
COMMENT ON COLUMN project.deliverable_outbox_dead_letter.delivery_count IS 'Total number of delivery attempts before moving to dead letter';
COMMENT ON COLUMN project.deliverable_outbox_dead_letter.resolution_status IS 'Resolution status: UNRESOLVED (needs attention), RETRYING (manual retry), RESOLVED (fixed), IGNORED (not needed)';
COMMENT ON COLUMN project.deliverable_outbox_dead_letter.resolution_notes IS 'Notes from administrator about the resolution';

-- Function to move failed event to dead letter
CREATE OR REPLACE FUNCTION project.move_to_dead_letter(outbox_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    event_record project.deliverable_outbox%ROWTYPE;
    error_hist JSONB;
BEGIN
    -- Get the failed event
    SELECT * INTO event_record
    FROM project.deliverable_outbox
    WHERE id = outbox_id AND status = 'FAILED';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Build error history JSON
    error_hist := jsonb_build_array(
        jsonb_build_object(
            'error', event_record.last_error,
            'at', event_record.last_error_at
        )
    );

    -- Insert into dead letter
    INSERT INTO project.deliverable_outbox_dead_letter (
        id, aggregate_type, aggregate_id, event_type, payload,
        stream_id, error_history, delivery_count, created_at,
        project_id
    ) VALUES (
        event_record.id,
        event_record.aggregate_type,
        event_record.aggregate_id,
        event_record.event_type,
        event_record.payload,
        event_record.stream_id,
        error_hist,
        event_record.retry_count + 1,
        event_record.created_at,
        event_record.project_id
    );

    -- Delete from outbox
    DELETE FROM project.deliverable_outbox WHERE id = outbox_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION project.move_to_dead_letter IS
'Moves a failed outbox event to the dead letter table.
Usage: SELECT project.move_to_dead_letter(''event-uuid'');';

-- Function to retry dead letter event
CREATE OR REPLACE FUNCTION project.retry_dead_letter(dead_letter_id VARCHAR(50), retry_user VARCHAR(100) DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    dl_record project.deliverable_outbox_dead_letter%ROWTYPE;
BEGIN
    -- Get the dead letter event
    SELECT * INTO dl_record
    FROM project.deliverable_outbox_dead_letter
    WHERE id = dead_letter_id AND resolution_status = 'UNRESOLVED';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update resolution status
    UPDATE project.deliverable_outbox_dead_letter
    SET resolution_status = 'RETRYING',
        resolved_by = retry_user,
        resolved_at = CURRENT_TIMESTAMP
    WHERE id = dead_letter_id;

    -- Reinsert into outbox
    INSERT INTO project.deliverable_outbox (
        id, aggregate_type, aggregate_id, event_type, payload,
        status, retry_count, max_retries, project_id, created_at
    ) VALUES (
        gen_random_uuid()::VARCHAR,
        dl_record.aggregate_type,
        dl_record.aggregate_id,
        dl_record.event_type,
        dl_record.payload,
        'PENDING',
        0,
        3,  -- Reduced retries for manual retry
        dl_record.project_id,
        CURRENT_TIMESTAMP
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION project.retry_dead_letter IS
'Retries a dead letter event by creating a new outbox entry with reset retry count.
Usage: SELECT project.retry_dead_letter(''event-uuid'', ''admin@example.com'');';
