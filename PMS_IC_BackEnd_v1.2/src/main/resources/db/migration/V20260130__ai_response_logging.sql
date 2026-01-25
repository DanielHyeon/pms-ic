-- Phase 1: AI Response Logging Tables
-- Implements Decision Authority Gate, Evidence System, and Failure Taxonomy tracking

-- Create chat schema if not exists
CREATE SCHEMA IF NOT EXISTS chat;

-- Chat sessions table (if not exists)
CREATE TABLE IF NOT EXISTS chat.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Response logs table
CREATE TABLE IF NOT EXISTS chat.ai_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat.chat_sessions(id),
    trace_id VARCHAR(100) NOT NULL,

    -- Request context
    user_query TEXT NOT NULL,
    intent VARCHAR(100),
    user_id UUID,
    user_role VARCHAR(50),
    project_id UUID,

    -- Response content
    response_content TEXT,
    track VARCHAR(20),  -- track_a or track_b

    -- Phase 1: Authority Gate
    authority_level VARCHAR(20) NOT NULL DEFAULT 'suggest',  -- suggest, decide, execute, commit
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_type VARCHAR(20),  -- user, manager, admin
    approval_status VARCHAR(20),  -- pending, approved, rejected
    approved_by UUID,
    approved_at TIMESTAMP,

    -- Phase 1: Confidence & Evidence
    confidence DECIMAL(5,4) DEFAULT 0.0,
    evidence_count INTEGER DEFAULT 0,
    has_sufficient_evidence BOOLEAN DEFAULT FALSE,

    -- Phase 1: Failure handling
    failure_code VARCHAR(50),
    failure_category VARCHAR(50),
    failure_message TEXT,
    recovery_action VARCHAR(50),
    retry_count INTEGER DEFAULT 0,

    -- Performance metrics
    processing_time_ms INTEGER,
    model_used VARCHAR(100),
    token_count_input INTEGER,
    token_count_output INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evidence links table
CREATE TABLE IF NOT EXISTS chat.ai_response_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES chat.ai_responses(id) ON DELETE CASCADE,

    source_type VARCHAR(50) NOT NULL,  -- document, issue, task, meeting, sprint, etc.
    source_id VARCHAR(100) NOT NULL,
    source_title VARCHAR(500),
    excerpt TEXT,
    relevance_score DECIMAL(5,4),
    url VARCHAR(1000),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actions log table (for EXECUTE/COMMIT actions)
CREATE TABLE IF NOT EXISTS chat.ai_response_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES chat.ai_responses(id) ON DELETE CASCADE,

    action_type VARCHAR(50) NOT NULL,  -- create, update, delete, execute
    target_type VARCHAR(50) NOT NULL,  -- task, sprint, report, backlog, etc.
    target_id VARCHAR(100),
    description TEXT,

    status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed, cancelled
    executed_at TIMESTAMP,
    error_message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval requests table
CREATE TABLE IF NOT EXISTS chat.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES chat.ai_responses(id) ON DELETE CASCADE,

    approval_type VARCHAR(20) NOT NULL,  -- user, manager, admin
    requested_by UUID NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, expired
    decided_by UUID,
    decided_at TIMESTAMP,
    decision_reason TEXT,

    expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_responses_session ON chat.ai_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_trace ON chat.ai_responses(trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_user ON chat.ai_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_project ON chat.ai_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_authority ON chat.ai_responses(authority_level);
CREATE INDEX IF NOT EXISTS idx_ai_responses_approval ON chat.ai_responses(approval_status) WHERE requires_approval = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_responses_created ON chat.ai_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_responses_failure ON chat.ai_responses(failure_code) WHERE failure_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_response_evidence_response ON chat.ai_response_evidence(response_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_evidence_source ON chat.ai_response_evidence(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_ai_response_actions_response ON chat.ai_response_actions(response_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_actions_status ON chat.ai_response_actions(status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_response ON chat.approval_requests(response_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON chat.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_pending ON chat.approval_requests(status, expires_at) WHERE status = 'pending';

-- Comments for documentation
COMMENT ON TABLE chat.ai_responses IS 'AI response logs with Phase 1 gates: authority, evidence, failure tracking';
COMMENT ON COLUMN chat.ai_responses.authority_level IS 'Phase 1 Decision Authority Gate: suggest, decide, execute, commit';
COMMENT ON COLUMN chat.ai_responses.requires_approval IS 'True for COMMIT actions that need user approval';
COMMENT ON COLUMN chat.ai_responses.failure_code IS 'Phase 1 Failure Taxonomy code';
COMMENT ON TABLE chat.ai_response_evidence IS 'Evidence/sources linked to AI responses';
COMMENT ON TABLE chat.ai_response_actions IS 'Actions taken or pending for EXECUTE/COMMIT responses';
COMMENT ON TABLE chat.approval_requests IS 'Approval workflow for COMMIT actions';
