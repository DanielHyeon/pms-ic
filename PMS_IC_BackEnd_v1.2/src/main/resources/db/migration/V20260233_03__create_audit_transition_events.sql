-- Phase 2-3: Create audit schema + status_transition_events table

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.status_transition_events (
    id               VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id        VARCHAR(36),
    project_id       VARCHAR(36),
    entity_type      VARCHAR(32) NOT NULL,   -- 'STORY','BACKLOG_ITEM','EPIC','SPRINT'
    entity_id        VARCHAR(36) NOT NULL,
    from_status      VARCHAR(32),            -- NULL = initial state
    to_status        VARCHAR(32) NOT NULL,
    changed_by       VARCHAR(36),
    change_source    VARCHAR(32) NOT NULL,   -- 'API','MIGRATION','SYSTEM'
    changed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata         JSONB
);

-- Entity history lookup (lead time / dwell time calculation)
CREATE INDEX IF NOT EXISTS idx_transition_entity_time
    ON audit.status_transition_events(entity_type, entity_id, changed_at);

-- Project timeline (PMO dashboard)
CREATE INDEX IF NOT EXISTS idx_transition_project_time
    ON audit.status_transition_events(project_id, changed_at);
