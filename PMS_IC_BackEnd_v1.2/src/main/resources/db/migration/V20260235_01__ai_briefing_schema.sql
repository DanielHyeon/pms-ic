-- V20260235_01: AI Briefing schema for decision support console
-- Tables: decision_trace_log (audit trail), briefing_cache (cold-start fallback)

CREATE SCHEMA IF NOT EXISTS ai;

-- Decision trace log (audit trail for AI-driven decisions)
CREATE TABLE ai.decision_trace_log (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    user_id             VARCHAR(36) NOT NULL,
    user_role           VARCHAR(50) NOT NULL,
    event_type          VARCHAR(30) NOT NULL,
    briefing_id         VARCHAR(36) NOT NULL,
    insight_id          VARCHAR(36),
    insight_type        VARCHAR(50),
    severity            VARCHAR(20),
    confidence          DECIMAL(3,2),
    action_id           VARCHAR(50),
    action_result       VARCHAR(20),
    generation_method   VARCHAR(20),
    completeness        VARCHAR(10),
    data_sources        JSONB,
    evidence_json       JSONB,
    as_of               TIMESTAMPTZ,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action_clicked_at   TIMESTAMPTZ,
    action_completed_at TIMESTAMPTZ
);

CREATE INDEX idx_trace_project ON ai.decision_trace_log(project_id, generated_at);
CREATE INDEX idx_trace_user ON ai.decision_trace_log(user_id, generated_at);
CREATE INDEX idx_trace_event ON ai.decision_trace_log(event_type, generated_at);
CREATE INDEX idx_trace_action ON ai.decision_trace_log(action_id, action_result)
    WHERE action_id IS NOT NULL;

-- Briefing cache (cold-start fallback when Redis is empty)
CREATE TABLE ai.briefing_cache (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    role                VARCHAR(50) NOT NULL,
    scope               VARCHAR(30) NOT NULL,
    as_of               TIMESTAMPTZ NOT NULL,
    completeness        VARCHAR(10) NOT NULL,
    generation_method   VARCHAR(20) NOT NULL,
    response_json       JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_briefing_cache UNIQUE(project_id, role, scope)
);

CREATE INDEX idx_briefing_cache_lookup ON ai.briefing_cache(project_id, role, scope);
