-- PMS Insurance Claims Database Schema
-- PostgreSQL with multiple schemas

-- ============================================
-- Schema Creation
-- ============================================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS task;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS rfp;
CREATE SCHEMA IF NOT EXISTS education;
CREATE SCHEMA IF NOT EXISTS lineage;

-- ============================================
-- AUTH SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS auth.users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    department VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS auth.permissions (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(category, name)
);

CREATE TABLE IF NOT EXISTS auth.role_permissions (
    id VARCHAR(36) PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission_id VARCHAR(36) NOT NULL REFERENCES auth.permissions(id),
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(role, permission_id)
);

-- ============================================
-- PROJECT SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS project.projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PLANNING',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    ai_weight DECIMAL(5, 2) DEFAULT 0.70,
    si_weight DECIMAL(5, 2) DEFAULT 0.30,
    progress INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.project_members (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES auth.users(id),
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project.phases (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    order_num INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    gate_status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0,
    description TEXT,
    track_type VARCHAR(20) DEFAULT 'COMMON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.parts (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leader_id VARCHAR(36),
    leader_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Part members junction table
CREATE TABLE IF NOT EXISTS project.part_members (
    part_id VARCHAR(36) NOT NULL REFERENCES project.parts(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES auth.users(id),
    PRIMARY KEY (part_id, user_id)
);

CREATE TABLE IF NOT EXISTS project.wbs_groups (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_num INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_items (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) REFERENCES project.wbs_groups(id) ON DELETE CASCADE,
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_num INTEGER,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    progress INTEGER DEFAULT 0,
    weight DECIMAL(5, 2) DEFAULT 1.0,
    track_type VARCHAR(20) DEFAULT 'COMMON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_tasks (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36) REFERENCES project.wbs_items(id) ON DELETE CASCADE,
    group_id VARCHAR(36) REFERENCES project.wbs_groups(id),
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_num INTEGER,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    progress INTEGER DEFAULT 0,
    weight DECIMAL(5, 2) DEFAULT 1.0,
    linked_task_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_dependencies (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    source_item_id VARCHAR(36) NOT NULL,
    target_item_id VARCHAR(36) NOT NULL,
    dependency_type VARCHAR(20) DEFAULT 'FS',
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.epics (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'BACKLOG',
    owner_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.features (
    id VARCHAR(36) PRIMARY KEY,
    epic_id VARCHAR(36) REFERENCES project.epics(id) ON DELETE CASCADE,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'BACKLOG',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.backlogs (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Product Backlog',
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.backlog_items (
    id VARCHAR(36) PRIMARY KEY,
    backlog_id VARCHAR(36) NOT NULL REFERENCES project.backlogs(id) ON DELETE CASCADE,
    requirement_id VARCHAR(36),
    origin_type VARCHAR(50) DEFAULT 'MANUAL',
    epic_id VARCHAR(36),
    epic_id_ref VARCHAR(36),
    priority_order INTEGER,
    status VARCHAR(50) DEFAULT 'BACKLOG',
    story_points INTEGER,
    estimated_effort_hours INTEGER,
    acceptance_criteria TEXT,
    sprint_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Requirement to Task link table (for lineage tracking)
CREATE TABLE IF NOT EXISTS project.requirement_task_links (
    requirement_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (requirement_id, task_id)
);

CREATE TABLE IF NOT EXISTS project.deliverables (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'DRAFT',
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    uploaded_by VARCHAR(36),
    approver VARCHAR(36),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.issues (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_type VARCHAR(50) DEFAULT 'BUG',
    status VARCHAR(50) DEFAULT 'OPEN',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    assignee VARCHAR(36),
    reporter VARCHAR(36),
    reviewer VARCHAR(36),
    due_date DATE,
    resolved_at TIMESTAMP,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.kpis (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    target DECIMAL(15, 2),
    current DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'ON_TRACK',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.meetings (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(50) DEFAULT 'REGULAR',
    scheduled_at TIMESTAMP,
    organizer VARCHAR(36),
    attendees TEXT,
    agenda TEXT,
    minutes TEXT,
    actual_start_at TIMESTAMP,
    actual_end_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- WBS Snapshot Tables
CREATE TABLE IF NOT EXISTS project.wbs_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_group_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    original_id VARCHAR(36),
    name VARCHAR(255),
    order_num INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project.wbs_item_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    group_snapshot_id VARCHAR(36) REFERENCES project.wbs_group_snapshots(id),
    original_id VARCHAR(36),
    name VARCHAR(255),
    status VARCHAR(50),
    progress INTEGER,
    planned_start_date DATE,
    planned_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project.wbs_task_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    item_snapshot_id VARCHAR(36) REFERENCES project.wbs_item_snapshots(id),
    original_id VARCHAR(36),
    name VARCHAR(255),
    status VARCHAR(50),
    progress INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project.wbs_dependency_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    source_item_id VARCHAR(36),
    target_item_id VARCHAR(36),
    dependency_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- ============================================
-- TASK SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS task.sprints (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'PLANNED',
    conwip_limit INTEGER,
    enable_wip_validation BOOLEAN DEFAULT TRUE,
    neo4j_node_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS task.user_stories (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36) REFERENCES task.sprints(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    story_points INTEGER,
    status VARCHAR(50) DEFAULT 'IDEA',
    assignee_id VARCHAR(36),
    epic VARCHAR(100),
    priority_order INTEGER,
    feature_id VARCHAR(36),
    wbs_item_id VARCHAR(36),
    part_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS task.tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36) REFERENCES task.sprints(id),
    user_story_id VARCHAR(36) REFERENCES task.user_stories(id),
    kanban_column_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'TODO',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    assignee_id VARCHAR(36),
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    due_date DATE,
    order_num INTEGER,
    neo4j_node_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS task.kanban_columns (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    order_num INTEGER NOT NULL,
    wip_limit INTEGER,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- User Story to Requirement link table (for lineage tracking)
CREATE TABLE IF NOT EXISTS task.user_story_requirement_links (
    user_story_id VARCHAR(36) NOT NULL REFERENCES task.user_stories(id) ON DELETE CASCADE,
    requirement_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (user_story_id, requirement_id)
);

CREATE TABLE IF NOT EXISTS task.weekly_reports (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36) REFERENCES task.sprints(id),
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    generated_by VARCHAR(36),
    generated_at TIMESTAMP,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    in_progress_tasks INTEGER DEFAULT 0,
    pending_tasks INTEGER DEFAULT 0,
    blocked_tasks INTEGER DEFAULT 0,
    velocity DECIMAL(5, 2),
    planned_story_points INTEGER,
    completed_story_points INTEGER,
    completion_rate DECIMAL(5, 2),
    summary TEXT,
    highlights TEXT,
    blockers TEXT,
    next_week_plans TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- CHAT SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS chat.chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS chat.chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES chat.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- REPORT SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS report.report_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_content TEXT,
    scope VARCHAR(50) DEFAULT 'PROJECT',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS report.reports (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36),
    template_id VARCHAR(36) REFERENCES report.report_templates(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    report_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'DRAFT',
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- RFP SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS rfp.rfps (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    submitted_at TIMESTAMP,
    deadline DATE,
    tenant_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS rfp.requirements (
    id VARCHAR(36) PRIMARY KEY,
    rfp_id VARCHAR(36) NOT NULL REFERENCES rfp.rfps(id) ON DELETE CASCADE,
    project_id VARCHAR(36),
    requirement_code VARCHAR(50),
    code VARCHAR(50),
    category VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'DRAFT',
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    progress INTEGER DEFAULT 0,
    order_num INTEGER,
    tenant_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- EDUCATION SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS education.educations (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    level VARCHAR(50),
    duration_hours INTEGER,
    content TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS education.education_roadmaps (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_role VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS education.education_sessions (
    id VARCHAR(36) PRIMARY KEY,
    roadmap_id VARCHAR(36) REFERENCES education.education_roadmaps(id) ON DELETE CASCADE,
    education_id VARCHAR(36) REFERENCES education.educations(id),
    order_num INTEGER,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS education.education_histories (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    education_id VARCHAR(36) REFERENCES education.educations(id),
    session_id VARCHAR(36) REFERENCES education.education_sessions(id),
    progress INTEGER DEFAULT 0,
    score DECIMAL(5, 2),
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- LINEAGE SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS lineage.outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    payload TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- INDEXES
-- ============================================

-- Auth indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON auth.role_permissions(role);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON project.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_phases_project ON project.phases(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_group ON project.wbs_items(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_item ON project.wbs_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_issues_project ON project.issues(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON project.deliverables(project_id);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_sprints_project ON task.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_project ON task.user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_sprint ON task.user_stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON task.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON task.tasks(sprint_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat.chat_messages(session_id);

-- Lineage indexes
CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON lineage.outbox_events(status);
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate ON lineage.outbox_events(aggregate_type, aggregate_id);
