-- V20260218__deliverable_outbox.sql
-- Create Transactional Outbox table for RAG indexing events

CREATE TABLE IF NOT EXISTS project.deliverable_outbox (
    -- Primary key (UUID as string for R2DBC compatibility)
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,

    -- Event identification
    aggregate_type VARCHAR(100) NOT NULL DEFAULT 'DELIVERABLE',
    aggregate_id VARCHAR(50) NOT NULL,      -- deliverable_id
    event_type VARCHAR(100) NOT NULL,       -- DELIVERABLE_UPLOADED, DELIVERABLE_DELETED, etc.

    -- Event payload (JSON)
    payload JSONB NOT NULL,

    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING: Waiting for processing
    -- PROCESSING: Currently being processed
    -- PROCESSED: Successfully processed
    -- RELAYED: Relayed to Redis Streams (Phase 3)
    -- FAILED: Max retries exceeded

    -- Redis Streams ID (Phase 3)
    stream_id VARCHAR(50),

    -- Retry tracking
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 5,
    next_retry_at TIMESTAMP,

    -- Error tracking
    last_error TEXT,
    last_error_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    relayed_at TIMESTAMP,

    -- Project scope
    project_id VARCHAR(50),

    -- Partition key for future table partitioning
    partition_date DATE DEFAULT CURRENT_DATE,

    -- Constraints
    CONSTRAINT chk_deliverable_outbox_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'RELAYED', 'FAILED'))
);

-- Indexes for Poller Service

-- 1. Pending events index (most critical for polling)
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_pending
    ON project.deliverable_outbox(status, next_retry_at, created_at)
    WHERE status IN ('PENDING', 'PROCESSING');

-- 2. Aggregate lookup index
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_aggregate
    ON project.deliverable_outbox(aggregate_type, aggregate_id);

-- 3. Event type index
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_event_type
    ON project.deliverable_outbox(event_type);

-- 4. Project-scoped query index
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_project
    ON project.deliverable_outbox(project_id, created_at DESC);

-- 5. Partition date index (for cleanup operations)
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_partition
    ON project.deliverable_outbox(partition_date);

-- 6. Failed events index (for monitoring)
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_failed
    ON project.deliverable_outbox(status, last_error_at)
    WHERE status = 'FAILED';

-- Table and column comments
COMMENT ON TABLE project.deliverable_outbox IS 'Transactional Outbox for RAG indexing events - ensures at-least-once delivery to LLM Service';

COMMENT ON COLUMN project.deliverable_outbox.event_type IS 'Event type: DELIVERABLE_UPLOADED, DELIVERABLE_DELETED, DELIVERABLE_APPROVED, DELIVERABLE_VERSION_UPDATED';
COMMENT ON COLUMN project.deliverable_outbox.aggregate_id IS 'Deliverable ID that triggered the event';
COMMENT ON COLUMN project.deliverable_outbox.payload IS 'JSON payload containing event data for LLM Service';
COMMENT ON COLUMN project.deliverable_outbox.stream_id IS 'Redis Streams message ID (Phase 3)';
COMMENT ON COLUMN project.deliverable_outbox.next_retry_at IS 'Next retry timestamp (exponential backoff)';

-- Cleanup function for old processed events
CREATE OR REPLACE FUNCTION project.cleanup_old_deliverable_outbox_events(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM project.deliverable_outbox
    WHERE status = 'PROCESSED'
      AND processed_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION project.cleanup_old_deliverable_outbox_events IS
'Removes processed outbox events older than specified days. Default: 7 days.
Usage: SELECT project.cleanup_old_deliverable_outbox_events(14);';
