-- ============================================================
-- V20260236_03: Collaboration Extensions
-- Meeting participants, agenda, minutes, decisions, action items
-- + Notice subsystem with read-state tracking
-- ============================================================

-- Meeting Participants (many-to-many)
CREATE TABLE IF NOT EXISTS project.meeting_participants (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(30) DEFAULT 'ATTENDEE',
    rsvp_status VARCHAR(20) DEFAULT 'PENDING',
    attended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_participant UNIQUE(meeting_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mp_meeting ON project.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_mp_user ON project.meeting_participants(user_id);

-- Meeting Agenda Items
CREATE TABLE IF NOT EXISTS project.meeting_agenda_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    duration_minutes INTEGER,
    presenter_id VARCHAR(36),
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mai_meeting ON project.meeting_agenda_items(meeting_id);

-- Meeting Minutes (structured, separate from the text field on meetings)
CREATE TABLE IF NOT EXISTS project.meeting_minutes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    generation_method VARCHAR(20) DEFAULT 'MANUAL',
    status VARCHAR(20) DEFAULT 'DRAFT',
    confirmed_by VARCHAR(36),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_meeting_minutes UNIQUE(meeting_id)
);

-- Meeting Decisions (extracted from minutes)
CREATE TABLE IF NOT EXISTS project.meeting_decisions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    minutes_id VARCHAR(36) REFERENCES project.meeting_minutes(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'PROPOSED',
    linked_decision_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS idx_md_meeting ON project.meeting_decisions(meeting_id);

-- Meeting Action Items
CREATE TABLE IF NOT EXISTS project.meeting_action_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    minutes_id VARCHAR(36) REFERENCES project.meeting_minutes(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assignee_id VARCHAR(36) NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'OPEN',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    linked_issue_id VARCHAR(36),
    linked_task_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS idx_mai2_meeting ON project.meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_mai2_assignee ON project.meeting_action_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_mai2_status ON project.meeting_action_items(status);

-- Notices
CREATE TABLE IF NOT EXISTS project.notices (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    category VARCHAR(30) DEFAULT 'GENERAL',
    status VARCHAR(20) DEFAULT 'DRAFT',
    pinned BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    published_by VARCHAR(36),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS idx_notice_project ON project.notices(project_id);
CREATE INDEX IF NOT EXISTS idx_notice_status ON project.notices(status);
CREATE INDEX IF NOT EXISTS idx_notice_priority ON project.notices(priority);
CREATE INDEX IF NOT EXISTS idx_notice_project_status ON project.notices(project_id, status);

-- Notice Read State (one per user per notice)
CREATE TABLE IF NOT EXISTS project.notice_read_state (
    notice_id VARCHAR(36) NOT NULL REFERENCES project.notices(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (notice_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_nrs_user ON project.notice_read_state(user_id);
