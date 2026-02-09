-- ============================================================
-- PMS Insurance Claims - Consolidated Schema (DDL)
-- Generated from 70 Flyway migrations (V20260117 ~ V20260236_05)
-- Executable against a fresh PostgreSQL 15 instance.
-- Assumes auth schema (auth.users, auth.permissions) already exists.
-- ============================================================

-- ============================================================
-- 0. DROP EXISTING OBJECTS (reverse dependency order)
-- ============================================================
DO $drop$
BEGIN
    -- Drop views first
    DROP VIEW IF EXISTS project.current_part_assignments CASCADE;
    DROP VIEW IF EXISTS project.part_backlog_summary CASCADE;
    DROP VIEW IF EXISTS project.v_orphan_requirement_ref CASCADE;
    DROP VIEW IF EXISTS project.v_dup_backlog_requirement CASCADE;
    DROP VIEW IF EXISTS task.part_weekly_report_summary CASCADE;
    DROP VIEW IF EXISTS task.v_orphan_part_ref CASCADE;
    DROP VIEW IF EXISTS task.v_orphan_epic_ref CASCADE;
    DROP VIEW IF EXISTS task.v_orphan_backlog_item_ref CASCADE;
    DROP VIEW IF EXISTS task.v_multi_requirement_stories CASCADE;
    DROP VIEW IF EXISTS task.v_mismatch_story_feature_part CASCADE;
    DROP VIEW IF EXISTS task.v_mismatch_story_epic_text CASCADE;
    DROP VIEW IF EXISTS report.v_user_next_scheduled_reports CASCADE;
    DROP VIEW IF EXISTS report.v_generation_statistics CASCADE;
    DROP VIEW IF EXISTS governance.v_effective_caps CASCADE;
    DROP VIEW IF EXISTS governance.v_delegated_caps CASCADE;
    DROP VIEW IF EXISTS governance.v_direct_caps CASCADE;
    DROP VIEW IF EXISTS governance.v_role_caps CASCADE;

    -- Drop functions
    DROP FUNCTION IF EXISTS project.generate_idempotency_key() CASCADE;
    DROP FUNCTION IF EXISTS project.cleanup_old_outbox_events(INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS project.cleanup_old_deliverable_outbox_events(INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS project.move_to_dead_letter(VARCHAR) CASCADE;
    DROP FUNCTION IF EXISTS project.retry_dead_letter(VARCHAR, VARCHAR) CASCADE;
    DROP FUNCTION IF EXISTS project.get_effective_part_id(VARCHAR, VARCHAR, TIMESTAMP) CASCADE;
    DROP FUNCTION IF EXISTS report.update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS report.cleanup_old_logs(INT) CASCADE;
    DROP FUNCTION IF EXISTS report.calculate_next_schedule(BOOLEAN, INT, TIME, VARCHAR) CASCADE;
END $drop$;

-- Drop tables in reverse dependency order (child before parent)
-- rfp schema
DROP TABLE IF EXISTS rfp.rfp_change_events CASCADE;
DROP TABLE IF EXISTS rfp.rfp_requirement_candidates CASCADE;
DROP TABLE IF EXISTS rfp.rfp_extraction_runs CASCADE;
DROP TABLE IF EXISTS rfp.rfp_document_chunks CASCADE;
DROP TABLE IF EXISTS rfp.rfp_versions CASCADE;
DROP TABLE IF EXISTS rfp.origin_policies CASCADE;

-- audit schema
DROP TABLE IF EXISTS audit.evidence_audit_trail CASCADE;
DROP TABLE IF EXISTS audit.evidence_packages CASCADE;
DROP TABLE IF EXISTS audit.data_quality_snapshots CASCADE;
DROP TABLE IF EXISTS audit.status_transition_events CASCADE;

-- ai schema
DROP TABLE IF EXISTS ai.briefing_cache CASCADE;
DROP TABLE IF EXISTS ai.decision_trace_log CASCADE;

-- governance schema
DROP TABLE IF EXISTS governance.governance_findings CASCADE;
DROP TABLE IF EXISTS governance.governance_check_runs CASCADE;
DROP TABLE IF EXISTS governance.sod_rules CASCADE;
DROP TABLE IF EXISTS governance.permission_audit_log CASCADE;
DROP TABLE IF EXISTS governance.outbox_events CASCADE;
DROP TABLE IF EXISTS governance.delegations CASCADE;
DROP TABLE IF EXISTS governance.user_capabilities CASCADE;
DROP TABLE IF EXISTS governance.user_roles CASCADE;
DROP TABLE IF EXISTS governance.role_capabilities CASCADE;
DROP TABLE IF EXISTS governance.capabilities CASCADE;
DROP TABLE IF EXISTS governance.roles CASCADE;
DROP TABLE IF EXISTS governance.accountability_change_log CASCADE;
DROP TABLE IF EXISTS governance.project_accountability CASCADE;

-- organization schema
DROP TABLE IF EXISTS organization.assignment_change_log CASCADE;
DROP TABLE IF EXISTS organization.part_memberships CASCADE;
DROP TABLE IF EXISTS organization.part_co_leaders CASCADE;
DROP TABLE IF EXISTS organization.parts CASCADE;

-- chat schema
DROP TABLE IF EXISTS chat.approval_requests CASCADE;
DROP TABLE IF EXISTS chat.ai_response_actions CASCADE;
DROP TABLE IF EXISTS chat.ai_response_evidence CASCADE;
DROP TABLE IF EXISTS chat.ai_responses CASCADE;
DROP TABLE IF EXISTS chat.chat_sessions CASCADE;

-- admin schema
DROP TABLE IF EXISTS admin.sync_history CASCADE;
DROP TABLE IF EXISTS admin.backup_history CASCADE;

-- report schema
DROP TABLE IF EXISTS report.report_data_snapshots CASCADE;
DROP TABLE IF EXISTS report.scheduled_report_jobs CASCADE;
DROP TABLE IF EXISTS report.text_to_sql_logs CASCADE;
DROP TABLE IF EXISTS report.report_generation_logs CASCADE;
DROP TABLE IF EXISTS report.user_report_settings CASCADE;
DROP TABLE IF EXISTS report.user_template_preferences CASCADE;
DROP TABLE IF EXISTS report.template_sections CASCADE;
DROP TABLE IF EXISTS report.report_templates CASCADE;
DROP TABLE IF EXISTS report.report_shares CASCADE;
DROP TABLE IF EXISTS report.report_comments CASCADE;
DROP TABLE IF EXISTS report.role_report_defaults CASCADE;
DROP TABLE IF EXISTS report.report_metrics_history CASCADE;
DROP TABLE IF EXISTS report.reports CASCADE;

-- task schema (child tables first)
DROP TABLE IF EXISTS task.test_run_step_results CASCADE;
DROP TABLE IF EXISTS task.test_runs CASCADE;
DROP TABLE IF EXISTS task.test_steps CASCADE;
DROP TABLE IF EXISTS task.test_case_story_links CASCADE;
DROP TABLE IF EXISTS task.test_case_requirement_links CASCADE;
DROP TABLE IF EXISTS task.test_cases CASCADE;
DROP TABLE IF EXISTS task.test_suites CASCADE;
DROP TABLE IF EXISTS task.user_story_requirement_links CASCADE;
DROP TABLE IF EXISTS task.weekly_report_trends CASCADE;
DROP TABLE IF EXISTS task.weekly_reports CASCADE;
DROP TABLE IF EXISTS task.tasks CASCADE;
DROP TABLE IF EXISTS task.user_stories CASCADE;
DROP TABLE IF EXISTS task.sprints CASCADE;
DROP TABLE IF EXISTS task.kanban_columns CASCADE;

-- project schema (child tables first)
DROP TABLE IF EXISTS project.notice_read_state CASCADE;
DROP TABLE IF EXISTS project.notices CASCADE;
DROP TABLE IF EXISTS project.meeting_action_items CASCADE;
DROP TABLE IF EXISTS project.meeting_decisions CASCADE;
DROP TABLE IF EXISTS project.meeting_minutes CASCADE;
DROP TABLE IF EXISTS project.meeting_agenda_items CASCADE;
DROP TABLE IF EXISTS project.meeting_participants CASCADE;
DROP TABLE IF EXISTS project.escalation_links CASCADE;
DROP TABLE IF EXISTS project.decision_risk_audit_trail CASCADE;
DROP TABLE IF EXISTS project.risk_assessments CASCADE;
DROP TABLE IF EXISTS project.risks CASCADE;
DROP TABLE IF EXISTS project.decisions CASCADE;
DROP TABLE IF EXISTS project.wbs_dependencies_snapshot CASCADE;
DROP TABLE IF EXISTS project.wbs_tasks_snapshot CASCADE;
DROP TABLE IF EXISTS project.wbs_items_snapshot CASCADE;
DROP TABLE IF EXISTS project.wbs_groups_snapshot CASCADE;
DROP TABLE IF EXISTS project.wbs_snapshots CASCADE;
DROP TABLE IF EXISTS project.wbs_dependencies CASCADE;
DROP TABLE IF EXISTS project.part_change_history CASCADE;
DROP TABLE IF EXISTS project.part_relationships CASCADE;
DROP TABLE IF EXISTS project.deliverable_outbox_dead_letter CASCADE;
DROP TABLE IF EXISTS project.deliverable_outbox CASCADE;
DROP TABLE IF EXISTS project.template_applications CASCADE;
DROP TABLE IF EXISTS project.wbs_task_templates CASCADE;
DROP TABLE IF EXISTS project.wbs_item_templates CASCADE;
DROP TABLE IF EXISTS project.wbs_group_templates CASCADE;
DROP TABLE IF EXISTS project.phase_templates CASCADE;
DROP TABLE IF EXISTS project.template_sets CASCADE;
DROP TABLE IF EXISTS project.wbs_item_story_links CASCADE;
DROP TABLE IF EXISTS project.wbs_tasks CASCADE;
DROP TABLE IF EXISTS project.wbs_items CASCADE;
DROP TABLE IF EXISTS project.wbs_groups CASCADE;
DROP TABLE IF EXISTS project.features CASCADE;
DROP TABLE IF EXISTS project.backlog_items CASCADE;
DROP TABLE IF EXISTS project.backlogs CASCADE;
DROP TABLE IF EXISTS project.epics CASCADE;
DROP TABLE IF EXISTS project.sprint_requirement_coverage CASCADE;
DROP TABLE IF EXISTS project.requirement_story_mapping CASCADE;
DROP TABLE IF EXISTS project.outbox_events CASCADE;
DROP TABLE IF EXISTS project.default_role_permissions CASCADE;
DROP TABLE IF EXISTS project.project_role_permissions CASCADE;
DROP TABLE IF EXISTS project.part_members CASCADE;
DROP TABLE IF EXISTS project.parts CASCADE;
DROP TABLE IF EXISTS project.project_members CASCADE;
DROP TABLE IF EXISTS project.requirement_sprint_mapping CASCADE;
DROP TABLE IF EXISTS project.requirement_task_links CASCADE;
DROP TABLE IF EXISTS project.requirements CASCADE;
DROP TABLE IF EXISTS project.rfps CASCADE;

-- ============================================================
-- 1. CREATE SCHEMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS task;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS governance;
CREATE SCHEMA IF NOT EXISTS organization;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS rfp;

-- ============================================================
-- 2. SCHEMA: project - Core project tables
-- ============================================================

-- 2.1 RFPs
CREATE TABLE IF NOT EXISTS project.rfps (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    processing_message TEXT,
    submitted_at TIMESTAMP,
    tenant_id VARCHAR(36) NOT NULL,
    -- V20260236_05 extensions
    origin_type VARCHAR(30),
    version_label VARCHAR(20) DEFAULT 'v1.0',
    checksum VARCHAR(100),
    previous_status VARCHAR(50),
    failure_reason TEXT,
    source_name VARCHAR(255),
    rfp_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_rfps_project_id ON project.rfps(project_id);
CREATE INDEX IF NOT EXISTS idx_rfps_status ON project.rfps(status);
CREATE INDEX IF NOT EXISTS idx_rfps_tenant_id ON project.rfps(tenant_id);

COMMENT ON TABLE project.rfps IS 'RFP (Request for Proposal) documents';
COMMENT ON COLUMN project.rfps.status IS 'EMPTY, ORIGIN_DEFINED, UPLOADED, PARSING, PARSED, EXTRACTING, EXTRACTED, REVIEWING, CONFIRMED, NEEDS_REANALYSIS, ON_HOLD, FAILED (also legacy: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED)';
COMMENT ON COLUMN project.rfps.processing_status IS 'PENDING, EXTRACTING, INDEXING, COMPLETED, FAILED';

-- 2.2 Requirements
CREATE TABLE IF NOT EXISTS project.requirements (
    id VARCHAR(36) PRIMARY KEY,
    rfp_id VARCHAR(36) REFERENCES project.rfps(id) ON DELETE SET NULL,
    project_id VARCHAR(36) NOT NULL,
    requirement_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'FUNCTIONAL',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'IDENTIFIED',
    progress_percentage INTEGER DEFAULT 0,
    source_text TEXT,
    page_number INTEGER,
    assignee_id VARCHAR(36),
    due_date DATE,
    acceptance_criteria TEXT,
    estimated_effort INTEGER,
    actual_effort INTEGER,
    story_points INTEGER,
    estimated_effort_hours INTEGER,
    actual_effort_hours INTEGER,
    remaining_effort_hours INTEGER,
    last_progress_update TIMESTAMP,
    progress_calc_method VARCHAR(50) DEFAULT 'STORY_POINT',
    source_requirement_id VARCHAR(36),
    tenant_id VARCHAR(36) NOT NULL,
    neo4j_node_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON project.requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_rfp_id ON project.requirements(rfp_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON project.requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_category ON project.requirements(category);
CREATE INDEX IF NOT EXISTS idx_requirements_assignee_id ON project.requirements(assignee_id);
CREATE INDEX IF NOT EXISTS idx_requirements_tenant_id ON project.requirements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_requirements_code ON project.requirements(requirement_code);
CREATE INDEX IF NOT EXISTS idx_requirements_progress_percentage ON project.requirements(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_requirements_effort ON project.requirements(estimated_effort_hours);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_req_source_unique ON project.requirements(project_id, source_requirement_id) WHERE source_requirement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_req_source_id ON project.requirements(source_requirement_id);

-- 2.3 Requirement links
CREATE TABLE IF NOT EXISTS project.requirement_task_links (
    requirement_id VARCHAR(36) NOT NULL REFERENCES project.requirements(id) ON DELETE CASCADE,
    task_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (requirement_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_req_task_links_task_id ON project.requirement_task_links(task_id);

CREATE TABLE IF NOT EXISTS project.requirement_sprint_mapping (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    requirement_id VARCHAR(36) NOT NULL REFERENCES project.requirements(id) ON DELETE CASCADE,
    sprint_id VARCHAR(36) NOT NULL,
    mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mapped_by VARCHAR(36),
    CONSTRAINT uk_req_sprint UNIQUE (requirement_id, sprint_id)
);
CREATE INDEX IF NOT EXISTS idx_req_sprint_mapping_sprint ON project.requirement_sprint_mapping(sprint_id);

CREATE TABLE IF NOT EXISTS project.requirement_story_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(50) NOT NULL,
    mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mapped_by VARCHAR(36),
    notes TEXT,
    UNIQUE(requirement_id, story_id)
);
CREATE INDEX IF NOT EXISTS idx_rsm_requirement_id ON project.requirement_story_mapping(requirement_id);
CREATE INDEX IF NOT EXISTS idx_rsm_story_id ON project.requirement_story_mapping(story_id);

CREATE TABLE IF NOT EXISTS project.sprint_requirement_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id VARCHAR(50) NOT NULL,
    requirement_id VARCHAR(36) NOT NULL,
    coverage_type VARCHAR(20) DEFAULT 'PARTIAL',
    covered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, requirement_id)
);

-- 2.4 Project Members
CREATE TABLE IF NOT EXISTS project.project_members (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100),
    user_email VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_project_members_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE,
    CONSTRAINT uq_project_members_project_user UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project.project_members(role);
CREATE INDEX IF NOT EXISTS idx_pm_user_active ON project.project_members(user_id, active);
CREATE INDEX IF NOT EXISTS idx_pm_project_active ON project.project_members(project_id, active);

-- 2.5 Project role permissions
CREATE TABLE IF NOT EXISTS project.project_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prp_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_prp_permission FOREIGN KEY (permission_id)
        REFERENCES auth.permissions(id),
    CONSTRAINT uq_prp_project_role_perm UNIQUE(project_id, role, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_prp_project_role ON project.project_role_permissions(project_id, role);

CREATE TABLE IF NOT EXISTS project.default_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drp_permission FOREIGN KEY (permission_id)
        REFERENCES auth.permissions(id),
    CONSTRAINT uq_drp_role_perm UNIQUE(role, permission_id)
);

-- 2.6 Parts
CREATE TABLE IF NOT EXISTS project.parts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_id VARCHAR(50) NOT NULL,
    leader_id VARCHAR(50),
    leader_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_parts_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_parts_project_id ON project.parts(project_id);
CREATE INDEX IF NOT EXISTS idx_parts_leader_id ON project.parts(leader_id);
CREATE INDEX IF NOT EXISTS idx_parts_status ON project.parts(status);

CREATE TABLE IF NOT EXISTS project.part_members (
    part_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    role_in_part VARCHAR(50) DEFAULT 'MEMBER',
    allocation INTEGER DEFAULT 100,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (part_id, user_id),
    CONSTRAINT fk_part_members_part FOREIGN KEY (part_id)
        REFERENCES project.parts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_part_members_user_id ON project.part_members(user_id);

-- 2.7 Part relationships and history
CREATE TABLE IF NOT EXISTS project.part_relationships (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    source_part_id VARCHAR(50) NOT NULL,
    target_part_id VARCHAR(50) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    description TEXT,
    dependency_description TEXT,
    strength VARCHAR(20) DEFAULT 'MEDIUM',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_part_rel_source FOREIGN KEY (source_part_id)
        REFERENCES project.parts(id) ON DELETE CASCADE,
    CONSTRAINT fk_part_rel_target FOREIGN KEY (target_part_id)
        REFERENCES project.parts(id) ON DELETE CASCADE,
    CONSTRAINT chk_no_self_relation CHECK (source_part_id <> target_part_id),
    CONSTRAINT uq_part_relationship UNIQUE (source_part_id, target_part_id, relationship_type)
);
CREATE INDEX IF NOT EXISTS idx_part_rel_source ON project.part_relationships(source_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_target ON project.part_relationships(target_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_type ON project.part_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_part_rel_active ON project.part_relationships(active);

CREATE TABLE IF NOT EXISTS project.part_change_history (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    entity_name VARCHAR(500),
    previous_part_id VARCHAR(50),
    previous_part_name VARCHAR(200),
    new_part_id VARCHAR(50) NOT NULL,
    new_part_name VARCHAR(200),
    project_id VARCHAR(50) NOT NULL,
    change_reason TEXT,
    changed_by_user_id VARCHAR(50),
    changed_by_user_name VARCHAR(100),
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_part_history_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_part_history_prev_part FOREIGN KEY (previous_part_id)
        REFERENCES project.parts(id) ON DELETE SET NULL,
    CONSTRAINT chk_valid_entity_type CHECK (entity_type IN ('FEATURE', 'USER_STORY', 'TASK'))
);
CREATE INDEX IF NOT EXISTS idx_part_history_entity ON project.part_change_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_part_history_new_part ON project.part_change_history(new_part_id);
CREATE INDEX IF NOT EXISTS idx_part_history_project ON project.part_change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_part_history_effective ON project.part_change_history(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_part_history_part_time ON project.part_change_history(new_part_id, effective_from, effective_to);

-- 2.8 Epics
CREATE TABLE IF NOT EXISTS project.epics (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    goal TEXT,
    owner_id VARCHAR(36),
    target_completion_date DATE,
    business_value INTEGER DEFAULT 0,
    total_story_points INTEGER DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    phase_id VARCHAR(50),
    color VARCHAR(20),
    progress INTEGER DEFAULT 0,
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_epic_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE,
    CONSTRAINT uk_project_epic_name UNIQUE (project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON project.epics(project_id);
CREATE INDEX IF NOT EXISTS idx_epics_status ON project.epics(status);
CREATE INDEX IF NOT EXISTS idx_epics_owner_id ON project.epics(owner_id);
CREATE INDEX IF NOT EXISTS idx_epics_business_value ON project.epics(business_value);
CREATE INDEX IF NOT EXISTS idx_epics_phase_id ON project.epics(phase_id);
CREATE INDEX IF NOT EXISTS idx_epics_project_order ON project.epics(project_id, order_num, updated_at);

-- Add FK for phase_id after phases table is guaranteed to exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_epic_phase'
        AND table_schema = 'project' AND table_name = 'epics'
    ) THEN
        ALTER TABLE project.epics
        ADD CONSTRAINT fk_epic_phase FOREIGN KEY (phase_id)
            REFERENCES project.phases(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2.9 Backlogs
CREATE TABLE IF NOT EXISTS project.backlogs (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) DEFAULT 'Product Backlog',
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_backlog_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_backlogs_project_id ON project.backlogs(project_id);
CREATE INDEX IF NOT EXISTS idx_backlogs_status ON project.backlogs(status);

CREATE TABLE IF NOT EXISTS project.backlog_items (
    id VARCHAR(36) PRIMARY KEY,
    backlog_id VARCHAR(36) NOT NULL,
    requirement_id VARCHAR(36),
    origin_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    epic_id_ref VARCHAR(36),
    epic_id VARCHAR(100),
    priority_order INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'BACKLOG',
    story_points INTEGER,
    estimated_effort_hours INTEGER,
    acceptance_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_backlog_item_backlog FOREIGN KEY (backlog_id)
        REFERENCES project.backlogs(id) ON DELETE CASCADE,
    CONSTRAINT fk_backlog_item_requirement FOREIGN KEY (requirement_id)
        REFERENCES project.requirements(id) ON DELETE SET NULL,
    CONSTRAINT fk_backlog_item_epic FOREIGN KEY (epic_id_ref)
        REFERENCES project.epics(id) ON DELETE SET NULL,
    CONSTRAINT uk_backlog_requirement UNIQUE (backlog_id, requirement_id)
);
CREATE INDEX IF NOT EXISTS idx_backlog_items_backlog_id ON project.backlog_items(backlog_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_requirement_id ON project.backlog_items(requirement_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON project.backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_backlog_items_priority_order ON project.backlog_items(priority_order);
CREATE INDEX IF NOT EXISTS idx_backlog_items_epic_id_ref ON project.backlog_items(epic_id_ref);
CREATE UNIQUE INDEX IF NOT EXISTS uq_backlog_items_backlog_requirement ON project.backlog_items(backlog_id, requirement_id) WHERE requirement_id IS NOT NULL;

-- 2.10 WBS hierarchy (Group -> Item -> Task)
CREATE TABLE IF NOT EXISTS project.wbs_groups (
    id VARCHAR(36) PRIMARY KEY,
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    progress INTEGER DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    weight NUMERIC(5,2) DEFAULT 1.0,
    order_num INTEGER DEFAULT 0,
    linked_epic_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_group_phase FOREIGN KEY (phase_id)
        REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_group_epic FOREIGN KEY (linked_epic_id)
        REFERENCES project.epics(id) ON DELETE SET NULL,
    CONSTRAINT uk_phase_wbs_group_code UNIQUE (phase_id, code)
);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_phase_id ON project.wbs_groups(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_status ON project.wbs_groups(status);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_linked_epic_id ON project.wbs_groups(linked_epic_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_code ON project.wbs_groups(code);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_phase_order ON project.wbs_groups(phase_id, order_num);

CREATE TABLE IF NOT EXISTS project.wbs_items (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    progress INTEGER DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    weight INTEGER DEFAULT 100,
    order_num INTEGER DEFAULT 0,
    estimated_hours NUMERIC(10,2) DEFAULT 0,
    actual_hours NUMERIC(10,2) DEFAULT 0,
    assignee_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_item_group FOREIGN KEY (group_id)
        REFERENCES project.wbs_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_item_phase FOREIGN KEY (phase_id)
        REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT uk_group_wbs_item_code UNIQUE (group_id, code)
);
CREATE INDEX IF NOT EXISTS idx_wbs_items_group_id ON project.wbs_items(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_phase_id ON project.wbs_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_status ON project.wbs_items(status);
CREATE INDEX IF NOT EXISTS idx_wbs_items_assignee_id ON project.wbs_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_group_order ON project.wbs_items(group_id, order_num);
CREATE INDEX IF NOT EXISTS idx_wbs_items_phase_order ON project.wbs_items(phase_id, order_num);

CREATE TABLE IF NOT EXISTS project.wbs_tasks (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    progress INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 100,
    order_num INTEGER DEFAULT 0,
    estimated_hours NUMERIC(10,2) DEFAULT 0,
    actual_hours NUMERIC(10,2) DEFAULT 0,
    assignee_id VARCHAR(36),
    linked_task_id VARCHAR(50),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_task_item FOREIGN KEY (item_id)
        REFERENCES project.wbs_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_task_group FOREIGN KEY (group_id)
        REFERENCES project.wbs_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_task_phase FOREIGN KEY (phase_id)
        REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT uk_item_wbs_task_code UNIQUE (item_id, code)
);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_item_id ON project.wbs_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_group_id ON project.wbs_tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_phase_id ON project.wbs_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_status ON project.wbs_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_assignee_id ON project.wbs_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_linked_task_id ON project.wbs_tasks(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_estimated_hours ON project.wbs_tasks(estimated_hours);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_item_order ON project.wbs_tasks(item_id, order_num);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_group_order ON project.wbs_tasks(group_id, order_num);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_phase_order ON project.wbs_tasks(phase_id, order_num);

-- 2.11 Features
CREATE TABLE IF NOT EXISTS project.features (
    id VARCHAR(36) PRIMARY KEY,
    epic_id VARCHAR(36) NOT NULL,
    wbs_group_id VARCHAR(36),
    part_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_feature_epic FOREIGN KEY (epic_id)
        REFERENCES project.epics(id) ON DELETE CASCADE,
    CONSTRAINT fk_feature_wbs_group FOREIGN KEY (wbs_group_id)
        REFERENCES project.wbs_groups(id) ON DELETE SET NULL,
    CONSTRAINT fk_feature_part FOREIGN KEY (part_id)
        REFERENCES project.parts(id) ON DELETE SET NULL,
    CONSTRAINT uk_epic_feature_name UNIQUE (epic_id, name)
);
CREATE INDEX IF NOT EXISTS idx_features_epic_id ON project.features(epic_id);
CREATE INDEX IF NOT EXISTS idx_features_wbs_group_id ON project.features(wbs_group_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON project.features(status);
CREATE INDEX IF NOT EXISTS idx_features_priority ON project.features(priority);
CREATE INDEX IF NOT EXISTS idx_features_part_id ON project.features(part_id);
CREATE INDEX IF NOT EXISTS idx_features_part_status ON project.features(part_id, status);

-- 2.12 WBS links
CREATE TABLE IF NOT EXISTS project.wbs_item_story_links (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wbs_item_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(50) NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    linked_by VARCHAR(36),
    CONSTRAINT fk_wis_link_wbs_item FOREIGN KEY (wbs_item_id)
        REFERENCES project.wbs_items(id) ON DELETE CASCADE,
    CONSTRAINT uk_wbs_item_story UNIQUE (wbs_item_id, story_id)
);
CREATE INDEX IF NOT EXISTS idx_wis_links_wbs_item_id ON project.wbs_item_story_links(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_wis_links_story_id ON project.wbs_item_story_links(story_id);

-- 2.13 WBS Dependencies
CREATE TABLE IF NOT EXISTS project.wbs_dependencies (
    id VARCHAR(36) PRIMARY KEY,
    predecessor_type VARCHAR(20) NOT NULL,
    predecessor_id VARCHAR(36) NOT NULL,
    successor_type VARCHAR(20) NOT NULL,
    successor_id VARCHAR(36) NOT NULL,
    dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
    lag_days INTEGER DEFAULT 0,
    project_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),
    CONSTRAINT uk_wbs_dependency UNIQUE (predecessor_id, successor_id),
    CONSTRAINT fk_wbs_dependency_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_wbs_dep_predecessor ON project.wbs_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dep_successor ON project.wbs_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dep_project ON project.wbs_dependencies(project_id);

-- 2.14 WBS Snapshots
CREATE TABLE IF NOT EXISTS project.wbs_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    phase_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    snapshot_name VARCHAR(255) NOT NULL,
    description TEXT,
    snapshot_type VARCHAR(20) NOT NULL DEFAULT 'PRE_TEMPLATE',
    group_count INTEGER DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    task_count INTEGER DEFAULT 0,
    dependency_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),
    restored_at TIMESTAMP,
    restored_by VARCHAR(36),
    CONSTRAINT fk_wbs_snapshot_phase FOREIGN KEY (phase_id) REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_snapshot_project FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_phase ON project.wbs_snapshots(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_project ON project.wbs_snapshots(project_id);

CREATE TABLE IF NOT EXISTS project.wbs_groups_snapshot (
    id VARCHAR(36) PRIMARY KEY, snapshot_id VARCHAR(36) NOT NULL, original_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(50) NOT NULL, code VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, status VARCHAR(50) NOT NULL, progress INTEGER, planned_start_date DATE,
    planned_end_date DATE, actual_start_date DATE, actual_end_date DATE, weight INTEGER,
    order_num INTEGER, linked_epic_id VARCHAR(36), original_created_at TIMESTAMP,
    original_created_by VARCHAR(36), original_updated_at TIMESTAMP, original_updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_group_snap_snapshot FOREIGN KEY (snapshot_id) REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS project.wbs_items_snapshot (
    id VARCHAR(36) PRIMARY KEY, snapshot_id VARCHAR(36) NOT NULL, original_id VARCHAR(36) NOT NULL,
    original_group_id VARCHAR(36) NOT NULL, phase_id VARCHAR(50) NOT NULL, code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL, description TEXT, status VARCHAR(50) NOT NULL, progress INTEGER,
    planned_start_date DATE, planned_end_date DATE, actual_start_date DATE, actual_end_date DATE,
    weight INTEGER, order_num INTEGER, estimated_hours INTEGER, actual_hours INTEGER,
    assignee_id VARCHAR(36), original_created_at TIMESTAMP, original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP, original_updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_item_snap_snapshot FOREIGN KEY (snapshot_id) REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS project.wbs_tasks_snapshot (
    id VARCHAR(36) PRIMARY KEY, snapshot_id VARCHAR(36) NOT NULL, original_id VARCHAR(36) NOT NULL,
    original_item_id VARCHAR(36) NOT NULL, original_group_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(50) NOT NULL, code VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, status VARCHAR(50) NOT NULL, progress INTEGER, weight INTEGER,
    order_num INTEGER, estimated_hours INTEGER, actual_hours INTEGER, assignee_id VARCHAR(36),
    linked_task_id VARCHAR(50), planned_start_date DATE, planned_end_date DATE,
    actual_start_date DATE, actual_end_date DATE, original_created_at TIMESTAMP,
    original_created_by VARCHAR(36), original_updated_at TIMESTAMP, original_updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_task_snap_snapshot FOREIGN KEY (snapshot_id) REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS project.wbs_dependencies_snapshot (
    id VARCHAR(36) PRIMARY KEY, snapshot_id VARCHAR(36) NOT NULL, original_id VARCHAR(36) NOT NULL,
    predecessor_type VARCHAR(20) NOT NULL, predecessor_id VARCHAR(36) NOT NULL,
    successor_type VARCHAR(20) NOT NULL, successor_id VARCHAR(36) NOT NULL,
    dependency_type VARCHAR(10) NOT NULL, lag_days INTEGER, project_id VARCHAR(50) NOT NULL,
    original_created_at TIMESTAMP, original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP, original_updated_by VARCHAR(36),
    CONSTRAINT fk_wbs_dep_snap_snapshot FOREIGN KEY (snapshot_id) REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);

-- 2.15 Templates
CREATE TABLE IF NOT EXISTS project.template_sets (
    id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT,
    category VARCHAR(50) NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    version VARCHAR(20) DEFAULT '1.0', is_default BOOLEAN DEFAULT FALSE, tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36), updated_by VARCHAR(36),
    CONSTRAINT uk_template_set_name UNIQUE (name)
);
CREATE TABLE IF NOT EXISTS project.phase_templates (
    id VARCHAR(36) PRIMARY KEY, template_set_id VARCHAR(36) NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, relative_order INTEGER DEFAULT 0, default_duration_days INTEGER,
    color VARCHAR(20), track_type VARCHAR(20) DEFAULT 'COMMON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phase_template_set FOREIGN KEY (template_set_id) REFERENCES project.template_sets(id) ON DELETE CASCADE,
    CONSTRAINT uk_template_phase_order UNIQUE (template_set_id, relative_order)
);
CREATE TABLE IF NOT EXISTS project.wbs_group_templates (
    id VARCHAR(36) PRIMARY KEY, phase_template_id VARCHAR(36) NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, relative_order INTEGER DEFAULT 0, default_weight INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wbs_group_template_phase FOREIGN KEY (phase_template_id) REFERENCES project.phase_templates(id) ON DELETE CASCADE,
    CONSTRAINT uk_phase_template_wbs_group_order UNIQUE (phase_template_id, relative_order)
);
CREATE TABLE IF NOT EXISTS project.wbs_item_templates (
    id VARCHAR(36) PRIMARY KEY, group_template_id VARCHAR(36) NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, relative_order INTEGER DEFAULT 0, default_weight INTEGER DEFAULT 100,
    estimated_hours INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wbs_item_template_group FOREIGN KEY (group_template_id) REFERENCES project.wbs_group_templates(id) ON DELETE CASCADE,
    CONSTRAINT uk_group_template_wbs_item_order UNIQUE (group_template_id, relative_order)
);
CREATE TABLE IF NOT EXISTS project.wbs_task_templates (
    id VARCHAR(36) PRIMARY KEY, item_template_id VARCHAR(36) NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, relative_order INTEGER DEFAULT 0, default_weight INTEGER DEFAULT 100,
    estimated_hours INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wbs_task_template_item FOREIGN KEY (item_template_id) REFERENCES project.wbs_item_templates(id) ON DELETE CASCADE,
    CONSTRAINT uk_item_template_wbs_task_order UNIQUE (item_template_id, relative_order)
);
CREATE TABLE IF NOT EXISTS project.template_applications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_set_id VARCHAR(36) NOT NULL, project_id VARCHAR(36) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, applied_by VARCHAR(36),
    phases_created INTEGER DEFAULT 0, wbs_groups_created INTEGER DEFAULT 0,
    wbs_items_created INTEGER DEFAULT 0, notes TEXT,
    CONSTRAINT fk_template_application_set FOREIGN KEY (template_set_id) REFERENCES project.template_sets(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_application_project FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE
);

-- 2.16 Outbox events
CREATE TABLE IF NOT EXISTS project.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL, payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP, retry_count INTEGER DEFAULT 0, last_error TEXT,
    idempotency_key VARCHAR(100) UNIQUE, project_id VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON project.outbox_events(status, created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON project.outbox_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_event_type ON project.outbox_events(event_type);
CREATE INDEX IF NOT EXISTS idx_outbox_events_project_created ON project.outbox_events(project_id, created_at DESC);

-- 2.17 Deliverable outbox + dead letter
CREATE TABLE IF NOT EXISTS project.deliverable_outbox (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    aggregate_type VARCHAR(100) NOT NULL DEFAULT 'DELIVERABLE', aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL, payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', stream_id VARCHAR(50),
    retry_count INT DEFAULT 0, max_retries INT DEFAULT 5, next_retry_at TIMESTAMP,
    last_error TEXT, last_error_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP, relayed_at TIMESTAMP, project_id VARCHAR(50),
    partition_date DATE DEFAULT CURRENT_DATE,
    CONSTRAINT chk_deliverable_outbox_status CHECK (status IN ('PENDING','PROCESSING','PROCESSED','RELAYED','FAILED'))
);
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_pending ON project.deliverable_outbox(status, next_retry_at, created_at) WHERE status IN ('PENDING','PROCESSING');
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_aggregate ON project.deliverable_outbox(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_project ON project.deliverable_outbox(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_failed ON project.deliverable_outbox(status, last_error_at) WHERE status = 'FAILED';

CREATE TABLE IF NOT EXISTS project.deliverable_outbox_dead_letter (
    id VARCHAR(50) PRIMARY KEY, aggregate_type VARCHAR(100) NOT NULL, aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL, payload JSONB NOT NULL, stream_id VARCHAR(50),
    error_history JSONB, delivery_count INT, created_at TIMESTAMP,
    moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, project_id VARCHAR(50),
    resolution_status VARCHAR(50) DEFAULT 'UNRESOLVED', resolution_notes TEXT,
    resolved_by VARCHAR(100), resolved_at TIMESTAMP,
    CONSTRAINT chk_dl_resolution_status CHECK (resolution_status IN ('UNRESOLVED','RETRYING','RESOLVED','IGNORED'))
);
CREATE INDEX IF NOT EXISTS idx_dl_unresolved ON project.deliverable_outbox_dead_letter(resolution_status, moved_at) WHERE resolution_status = 'UNRESOLVED';

-- 2.18 Decisions and Risks
CREATE TABLE IF NOT EXISTS project.decisions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, decision_code VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL, description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED', priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    category VARCHAR(50), owner_id VARCHAR(36) NOT NULL, part_id VARCHAR(36), phase_id VARCHAR(36),
    options_json JSONB DEFAULT '[]'::jsonb, selected_option VARCHAR(100), rationale TEXT,
    due_date DATE, decided_at TIMESTAMPTZ, decided_by VARCHAR(36),
    etag VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text, sla_hours INTEGER DEFAULT 168,
    escalated_from_id VARCHAR(36), escalated_from_type VARCHAR(20),
    version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(), created_by VARCHAR(36), updated_by VARCHAR(36),
    CONSTRAINT uq_decision_code_project UNIQUE(project_id, decision_code)
);
CREATE INDEX IF NOT EXISTS idx_dec_project_status ON project.decisions(project_id, status);

CREATE TABLE IF NOT EXISTS project.risks (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, risk_code VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL, description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'IDENTIFIED', category VARCHAR(50),
    impact INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
    probability INTEGER NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
    score INTEGER GENERATED ALWAYS AS (impact * probability) STORED,
    owner_id VARCHAR(36) NOT NULL, part_id VARCHAR(36), phase_id VARCHAR(36),
    mitigation_plan TEXT, contingency_plan TEXT, due_date DATE,
    etag VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text,
    escalated_from_id VARCHAR(36), escalated_from_type VARCHAR(20), escalated_to_id VARCHAR(36),
    version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(), created_by VARCHAR(36), updated_by VARCHAR(36),
    CONSTRAINT uq_risk_code_project UNIQUE(project_id, risk_code)
);
CREATE INDEX IF NOT EXISTS idx_risk_project_status ON project.risks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_score ON project.risks(score DESC);

CREATE TABLE IF NOT EXISTS project.risk_assessments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    risk_id VARCHAR(36) NOT NULL REFERENCES project.risks(id) ON DELETE CASCADE,
    assessed_by VARCHAR(36) NOT NULL,
    impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
    probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
    score INTEGER GENERATED ALWAYS AS (impact * probability) STORED,
    justification TEXT, ai_assisted BOOLEAN DEFAULT FALSE, ai_confidence DECIMAL(3,2),
    assessment_source VARCHAR(30) DEFAULT 'MANUAL', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project.decision_risk_audit_trail (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type VARCHAR(20) NOT NULL, entity_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL, action VARCHAR(50) NOT NULL,
    from_status VARCHAR(30), to_status VARCHAR(30), actor_id VARCHAR(36) NOT NULL,
    details_json JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project.escalation_links (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_type VARCHAR(20) NOT NULL, source_id VARCHAR(36) NOT NULL,
    target_type VARCHAR(20) NOT NULL, target_id VARCHAR(36) NOT NULL,
    escalated_by VARCHAR(36) NOT NULL, reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_escalation_link UNIQUE(source_type, source_id, target_type, target_id)
);

-- 2.19 Collaboration (meetings, notices)
CREATE TABLE IF NOT EXISTS project.meeting_participants (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL, role VARCHAR(30) DEFAULT 'ATTENDEE',
    rsvp_status VARCHAR(20) DEFAULT 'PENDING', attended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_participant UNIQUE(meeting_id, user_id)
);
CREATE TABLE IF NOT EXISTS project.meeting_agenda_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL DEFAULT 0, title VARCHAR(500) NOT NULL, description TEXT,
    duration_minutes INTEGER, presenter_id VARCHAR(36), status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS project.meeting_minutes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    content TEXT NOT NULL, generation_method VARCHAR(20) DEFAULT 'MANUAL',
    status VARCHAR(20) DEFAULT 'DRAFT', confirmed_by VARCHAR(36), confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(36), updated_by VARCHAR(36),
    CONSTRAINT uq_meeting_minutes UNIQUE(meeting_id)
);
CREATE TABLE IF NOT EXISTS project.meeting_decisions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    minutes_id VARCHAR(36) REFERENCES project.meeting_minutes(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL, description TEXT, status VARCHAR(20) DEFAULT 'PROPOSED',
    linked_decision_id VARCHAR(36), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(36)
);
CREATE TABLE IF NOT EXISTS project.meeting_action_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    minutes_id VARCHAR(36) REFERENCES project.meeting_minutes(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL, description TEXT, assignee_id VARCHAR(36) NOT NULL,
    due_date DATE, status VARCHAR(20) DEFAULT 'OPEN', priority VARCHAR(20) DEFAULT 'MEDIUM',
    linked_issue_id VARCHAR(36), linked_task_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), created_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.notices (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, title VARCHAR(500) NOT NULL, content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL', category VARCHAR(30) DEFAULT 'GENERAL',
    status VARCHAR(20) DEFAULT 'DRAFT', pinned BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ, published_by VARCHAR(36), expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(36), updated_by VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS idx_notice_project_status ON project.notices(project_id, status);

CREATE TABLE IF NOT EXISTS project.notice_read_state (
    notice_id VARCHAR(36) NOT NULL REFERENCES project.notices(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (notice_id, user_id)
);

-- 2.20 Phases hierarchy column
-- NOTE: project.phases table is assumed to already exist (created by earlier base migration).
-- Add parent_id for sub-phase support and track_type
ALTER TABLE project.phases ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36) REFERENCES project.phases(id) ON DELETE CASCADE;
ALTER TABLE project.phases ADD COLUMN IF NOT EXISTS track_type VARCHAR(20) NOT NULL DEFAULT 'COMMON';
CREATE INDEX IF NOT EXISTS idx_phases_parent_id ON project.phases(parent_id);
CREATE INDEX IF NOT EXISTS idx_phases_project_order ON project.phases(project_id, order_num);

-- 2.21 Project-level columns
ALTER TABLE project.projects ADD COLUMN IF NOT EXISTS ai_weight DECIMAL(5,2) DEFAULT 0.70;
ALTER TABLE project.projects ADD COLUMN IF NOT EXISTS si_weight DECIMAL(5,2) DEFAULT 0.30;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_track_weights') THEN
        ALTER TABLE project.projects ADD CONSTRAINT chk_track_weights CHECK (ai_weight >= 0 AND si_weight >= 0 AND (ai_weight + si_weight) <= 1.00);
    END IF;
END $$;

-- 2.22 Deliverables RAG columns
ALTER TABLE project.deliverables ADD COLUMN IF NOT EXISTS rag_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE project.deliverables ADD COLUMN IF NOT EXISTS rag_last_error TEXT;
ALTER TABLE project.deliverables ADD COLUMN IF NOT EXISTS rag_updated_at TIMESTAMP;
ALTER TABLE project.deliverables ADD COLUMN IF NOT EXISTS rag_version INT DEFAULT 1;
ALTER TABLE project.deliverables ADD COLUMN IF NOT EXISTS rag_doc_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_deliverables_rag_status ON project.deliverables(rag_status);
CREATE INDEX IF NOT EXISTS idx_deliverables_rag_doc_id ON project.deliverables(rag_doc_id) WHERE rag_doc_id IS NOT NULL;

-- 2.23 Issues resolution column
ALTER TABLE project.issues ADD COLUMN IF NOT EXISTS resolution VARCHAR(255);

-- ============================================================
-- 3. SCHEMA: task
-- ============================================================

-- task.tasks additional columns (assumes tasks/sprints/kanban_columns/user_stories already exist)
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS user_story_id VARCHAR(50);
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS sprint_id VARCHAR(50);
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS neo4j_node_id VARCHAR(100);
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS part_id VARCHAR(50);
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS phase_id VARCHAR(36);
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS track_type VARCHAR(20) DEFAULT 'COMMON';
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE task.tasks ADD COLUMN IF NOT EXISTS column_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_tasks_user_story_id ON task.tasks(user_story_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON task.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_part_id ON task.tasks(part_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON task.tasks(phase_id);

-- task.user_stories additional columns
ALTER TABLE task.user_stories ADD COLUMN IF NOT EXISTS neo4j_node_id VARCHAR(100);
ALTER TABLE task.user_stories ADD COLUMN IF NOT EXISTS feature_id VARCHAR(36);
ALTER TABLE task.user_stories ADD COLUMN IF NOT EXISTS wbs_item_id VARCHAR(36);
ALTER TABLE task.user_stories ADD COLUMN IF NOT EXISTS part_id VARCHAR(50);
ALTER TABLE task.user_stories ADD COLUMN IF NOT EXISTS epic_id VARCHAR(36);
ALTER TABLE task.user_stories ADD COLUMN IF NOT EXISTS backlog_item_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_user_stories_feature_id ON task.user_stories(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_wbs_item_id ON task.user_stories(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_part_id ON task.user_stories(part_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_epic_id ON task.user_stories(epic_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_backlog_item_id ON task.user_stories(backlog_item_id);

-- task.sprints additional columns
ALTER TABLE task.sprints ADD COLUMN IF NOT EXISTS neo4j_node_id VARCHAR(100);
ALTER TABLE task.sprints ADD COLUMN IF NOT EXISTS conwip_limit INTEGER;
ALTER TABLE task.sprints ADD COLUMN IF NOT EXISTS enable_wip_validation BOOLEAN DEFAULT TRUE;

-- task.kanban_columns WIP columns
ALTER TABLE task.kanban_columns ADD COLUMN IF NOT EXISTS wip_limit_soft INTEGER;
ALTER TABLE task.kanban_columns ADD COLUMN IF NOT EXISTS wip_limit_hard INTEGER;
ALTER TABLE task.kanban_columns ADD COLUMN IF NOT EXISTS is_bottleneck_column BOOLEAN DEFAULT FALSE;

-- 3.1 Weekly Reports
CREATE TABLE IF NOT EXISTS task.weekly_reports (
    id VARCHAR(36) PRIMARY KEY, project_id VARCHAR(50) NOT NULL, sprint_id VARCHAR(50),
    week_start_date DATE NOT NULL, week_end_date DATE NOT NULL,
    generated_by VARCHAR(50), generated_at DATE NOT NULL,
    total_tasks INTEGER, completed_tasks INTEGER, in_progress_tasks INTEGER,
    todo_tasks INTEGER, blocked_tasks INTEGER, completion_rate DECIMAL(5,2),
    velocity DECIMAL(10,2), story_points_completed INTEGER, story_points_in_progress INTEGER,
    story_points_planned INTEGER, average_wip_count INTEGER, peak_wip_count INTEGER,
    flow_efficiency DECIMAL(5,2), bottlenecks TEXT, velocity_trend DECIMAL(10,2),
    completion_trend DECIMAL(5,2), recommendations TEXT, summary TEXT, generated_content TEXT,
    llm_model VARCHAR(100), llm_confidence_score DECIMAL(3,2),
    part_id VARCHAR(50), scope_type VARCHAR(20) DEFAULT 'PROJECT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36), updated_by VARCHAR(36),
    CONSTRAINT fk_weekly_report_project FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_weekly_report_sprint FOREIGN KEY (sprint_id) REFERENCES task.sprints(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_project_id ON task.weekly_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_project_week ON task.weekly_reports(project_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_part_id ON task.weekly_reports(part_id);

CREATE TABLE IF NOT EXISTS task.weekly_report_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL, metric_value DECIMAL(10,2), week_end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trend_project FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE,
    CONSTRAINT uk_trend_metric_date UNIQUE (project_id, metric_name, week_end_date)
);

-- 3.2 Test Management (V20260236_02)
CREATE TABLE IF NOT EXISTS task.test_suites (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, name VARCHAR(255) NOT NULL, description TEXT,
    suite_type VARCHAR(30) NOT NULL DEFAULT 'GENERAL', status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    phase_id VARCHAR(36), owner_id VARCHAR(36), order_num INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(36), updated_by VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS idx_ts_project ON task.test_suites(project_id);

CREATE TABLE IF NOT EXISTS task.test_cases (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    suite_id VARCHAR(36) NOT NULL REFERENCES task.test_suites(id) ON DELETE CASCADE,
    test_case_code VARCHAR(50) NOT NULL, title VARCHAR(500) NOT NULL, description TEXT,
    preconditions TEXT, test_type VARCHAR(30) DEFAULT 'MANUAL',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    definition_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    last_outcome VARCHAR(20) DEFAULT 'NOT_RUN',
    derived_status VARCHAR(30) GENERATED ALWAYS AS (
        CASE
            WHEN definition_status = 'DEPRECATED' THEN 'DEPRECATED'
            WHEN definition_status = 'DRAFT' THEN 'DRAFT'
            WHEN last_outcome = 'NOT_RUN' THEN 'READY_NOT_RUN'
            WHEN last_outcome = 'PASSED' THEN 'PASSED'
            WHEN last_outcome = 'FAILED' THEN 'FAILED'
            WHEN last_outcome = 'BLOCKED' THEN 'BLOCKED'
            WHEN last_outcome = 'SKIPPED' THEN 'SKIPPED'
            ELSE 'UNKNOWN'
        END
    ) STORED,
    assignee_id VARCHAR(36), phase_id VARCHAR(36), run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ, estimated_duration INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(36), updated_by VARCHAR(36),
    CONSTRAINT uq_tc_code_project UNIQUE(project_id, test_case_code)
);
CREATE INDEX IF NOT EXISTS idx_tc_project ON task.test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_tc_suite ON task.test_cases(suite_id);

CREATE TABLE IF NOT EXISTS task.test_case_requirement_links (
    test_case_id VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    requirement_id VARCHAR(36) NOT NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by VARCHAR(36), PRIMARY KEY (test_case_id, requirement_id)
);
CREATE TABLE IF NOT EXISTS task.test_case_story_links (
    test_case_id VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    story_id VARCHAR(36) NOT NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by VARCHAR(36), PRIMARY KEY (test_case_id, story_id)
);

CREATE TABLE IF NOT EXISTS task.test_steps (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_case_id VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL, action TEXT NOT NULL, expected_result TEXT NOT NULL,
    test_data TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_step_order UNIQUE(test_case_id, step_number)
);

CREATE TABLE IF NOT EXISTS task.test_runs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_case_id VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    project_id VARCHAR(36) NOT NULL, run_number INTEGER NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'DETAILED', result VARCHAR(20) NOT NULL,
    executor_id VARCHAR(36) NOT NULL, environment VARCHAR(50),
    started_at TIMESTAMPTZ NOT NULL, finished_at TIMESTAMPTZ, duration_seconds INTEGER,
    notes TEXT, defect_issue_id VARCHAR(36), defect_create_status VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_number UNIQUE(test_case_id, run_number)
);

CREATE TABLE IF NOT EXISTS task.test_run_step_results (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_run_id VARCHAR(36) NOT NULL REFERENCES task.test_runs(id) ON DELETE CASCADE,
    test_step_id VARCHAR(36) NOT NULL REFERENCES task.test_steps(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL, actual_result TEXT, status VARCHAR(20) NOT NULL,
    screenshot_path VARCHAR(500), notes TEXT
);

-- 3.3 FK constraints on task tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_part_id') THEN
        ALTER TABLE task.tasks ADD CONSTRAINT fk_tasks_part_id FOREIGN KEY (part_id) REFERENCES project.parts(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_stories_epic_id') THEN
        ALTER TABLE task.user_stories ADD CONSTRAINT fk_user_stories_epic_id FOREIGN KEY (epic_id) REFERENCES project.epics(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_stories_part_id') THEN
        ALTER TABLE task.user_stories ADD CONSTRAINT fk_user_stories_part_id FOREIGN KEY (part_id) REFERENCES project.parts(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_stories_backlog_item_id') THEN
        ALTER TABLE task.user_stories ADD CONSTRAINT fk_user_stories_backlog_item_id FOREIGN KEY (backlog_item_id) REFERENCES project.backlog_items(id) ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_story_requirement_one ON task.user_story_requirement_links(user_story_id);

-- ============================================================
-- 4. SCHEMA: chat
-- ============================================================
CREATE TABLE IF NOT EXISTS chat.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, project_id UUID,
    title VARCHAR(255), status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chat.ai_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id UUID REFERENCES chat.chat_sessions(id),
    trace_id VARCHAR(100) NOT NULL, user_query TEXT NOT NULL, intent VARCHAR(100),
    user_id UUID, user_role VARCHAR(50), project_id UUID, response_content TEXT, track VARCHAR(20),
    authority_level VARCHAR(20) NOT NULL DEFAULT 'suggest', requires_approval BOOLEAN DEFAULT FALSE,
    approval_type VARCHAR(20), approval_status VARCHAR(20), approved_by UUID, approved_at TIMESTAMP,
    confidence DECIMAL(5,4) DEFAULT 0.0, evidence_count INTEGER DEFAULT 0,
    has_sufficient_evidence BOOLEAN DEFAULT FALSE, failure_code VARCHAR(50),
    failure_category VARCHAR(50), failure_message TEXT, recovery_action VARCHAR(50),
    retry_count INTEGER DEFAULT 0, processing_time_ms INTEGER, model_used VARCHAR(100),
    token_count_input INTEGER, token_count_output INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_responses_session ON chat.ai_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_trace ON chat.ai_responses(trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_project ON chat.ai_responses(project_id);

CREATE TABLE IF NOT EXISTS chat.ai_response_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), response_id UUID NOT NULL REFERENCES chat.ai_responses(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, source_id VARCHAR(100) NOT NULL, source_title VARCHAR(500),
    excerpt TEXT, relevance_score DECIMAL(5,4), url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chat.ai_response_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), response_id UUID NOT NULL REFERENCES chat.ai_responses(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, target_type VARCHAR(50) NOT NULL, target_id VARCHAR(100),
    description TEXT, status VARCHAR(20) DEFAULT 'pending', executed_at TIMESTAMP, error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chat.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), response_id UUID NOT NULL REFERENCES chat.ai_responses(id) ON DELETE CASCADE,
    approval_type VARCHAR(20) NOT NULL, requested_by UUID NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status VARCHAR(20) DEFAULT 'pending',
    decided_by UUID, decided_at TIMESTAMP, decision_reason TEXT, expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. SCHEMA: report
-- ============================================================
CREATE TABLE IF NOT EXISTS report.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL, report_scope VARCHAR(30) NOT NULL, title VARCHAR(500),
    period_start DATE NOT NULL, period_end DATE NOT NULL, scope_phase_id VARCHAR(50),
    scope_team_id VARCHAR(50), scope_user_id VARCHAR(50), created_by VARCHAR(50) NOT NULL,
    creator_role VARCHAR(30) NOT NULL, generation_mode VARCHAR(20) NOT NULL, template_id UUID,
    status VARCHAR(20) DEFAULT 'DRAFT', content JSONB NOT NULL, metrics_snapshot JSONB,
    llm_generated_sections TEXT[], llm_model VARCHAR(100), llm_confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    CONSTRAINT fk_report_project FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reports_project ON report.reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON report.reports(created_at DESC);

CREATE TABLE IF NOT EXISTS report.report_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL, report_type VARCHAR(20) NOT NULL, fiscal_year INT, fiscal_quarter INT,
    fiscal_month INT, fiscal_week INT, total_tasks INT DEFAULT 0, completed_tasks INT DEFAULT 0,
    in_progress_tasks INT DEFAULT 0, blocked_tasks INT DEFAULT 0, delayed_tasks INT DEFAULT 0,
    completion_rate DECIMAL(5,2), velocity DECIMAL(10,2), story_points_completed INT DEFAULT 0,
    story_points_planned INT DEFAULT 0, bug_count INT DEFAULT 0, bug_resolved INT DEFAULT 0,
    test_coverage DECIMAL(5,2), scope_type VARCHAR(30), scope_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, metric_date, report_type, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS report.role_report_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), role VARCHAR(30) NOT NULL,
    report_type VARCHAR(30) NOT NULL, default_scope VARCHAR(30) NOT NULL,
    default_sections TEXT[] NOT NULL, can_change_scope BOOLEAN DEFAULT false,
    can_select_sections BOOLEAN DEFAULT true, can_extend_period BOOLEAN DEFAULT false,
    max_period_days INT DEFAULT 7, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(role, report_type)
);
CREATE TABLE IF NOT EXISTS report.report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report.reports(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL, content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES report.report_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS report.report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report.reports(id) ON DELETE CASCADE,
    shared_with_user_id VARCHAR(50), shared_with_team_id VARCHAR(50), shared_with_role VARCHAR(30),
    permission VARCHAR(20) DEFAULT 'VIEW', shared_by VARCHAR(50) NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP,
    CONSTRAINT chk_share_target CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_team_id IS NULL AND shared_with_role IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_team_id IS NOT NULL AND shared_with_role IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_team_id IS NULL AND shared_with_role IS NOT NULL)
    )
);
CREATE TABLE IF NOT EXISTS report.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(200) NOT NULL, description TEXT,
    report_type VARCHAR(30) NOT NULL, scope VARCHAR(30) NOT NULL, organization_id VARCHAR(50),
    created_by VARCHAR(50), target_roles TEXT[], target_report_scopes TEXT[],
    structure JSONB NOT NULL, styling JSONB, is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, version INT DEFAULT 1,
    scope_type VARCHAR(20) DEFAULT 'PROJECT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS report.template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report.report_templates(id) ON DELETE CASCADE,
    section_key VARCHAR(50) NOT NULL, title VARCHAR(200) NOT NULL, section_type VARCHAR(30) NOT NULL,
    config JSONB NOT NULL, is_required BOOLEAN DEFAULT false, display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS report.user_template_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL,
    preferred_template_id UUID REFERENCES report.report_templates(id) ON DELETE SET NULL,
    section_overrides JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, report_type)
);
CREATE TABLE IF NOT EXISTS report.user_report_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50), weekly_enabled BOOLEAN DEFAULT false, weekly_day_of_week INT DEFAULT 1,
    weekly_time TIME DEFAULT '09:00:00',
    weekly_template_id UUID REFERENCES report.report_templates(id) ON DELETE SET NULL,
    weekly_sections TEXT[], weekly_use_ai_summary BOOLEAN DEFAULT true,
    monthly_enabled BOOLEAN DEFAULT false, monthly_day_of_month INT DEFAULT 1,
    monthly_time TIME DEFAULT '09:00:00',
    monthly_template_id UUID REFERENCES report.report_templates(id) ON DELETE SET NULL,
    monthly_sections TEXT[], monthly_use_ai_summary BOOLEAN DEFAULT true,
    notify_on_complete BOOLEAN DEFAULT true, notify_email BOOLEAN DEFAULT false,
    notify_email_address VARCHAR(255), notify_slack BOOLEAN DEFAULT false,
    notify_slack_channel VARCHAR(100), auto_publish BOOLEAN DEFAULT false,
    edit_after_generate BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, project_id)
);
CREATE TABLE IF NOT EXISTS report.report_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(50) NOT NULL,
    report_id UUID REFERENCES report.reports(id) ON DELETE SET NULL, project_id VARCHAR(50),
    generation_mode VARCHAR(20) NOT NULL, report_type VARCHAR(30), template_id UUID,
    status VARCHAR(20) NOT NULL, error_message TEXT, error_details JSONB,
    data_collection_ms INT, llm_generation_ms INT, total_duration_ms INT,
    sections_generated TEXT[], sections_failed TEXT[], llm_model VARCHAR(100), llm_tokens_used INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS report.text_to_sql_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50), user_role VARCHAR(30), natural_language_query TEXT NOT NULL,
    generated_sql TEXT, sql_explanation TEXT, execution_status VARCHAR(20), result_count INT,
    error_message TEXT, was_sanitized BOOLEAN DEFAULT false, sanitization_notes TEXT,
    blocked_patterns TEXT[], generation_ms INT, execution_ms INT, llm_model VARCHAR(100),
    llm_confidence DECIMAL(3,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS report.scheduled_report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50),
    settings_id UUID REFERENCES report.user_report_settings(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL, scheduled_at TIMESTAMP NOT NULL, executed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDING',
    report_id UUID REFERENCES report.reports(id) ON DELETE SET NULL,
    error_message TEXT, retry_count INT DEFAULT 0, max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS report.report_data_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id VARCHAR(50) NOT NULL,
    snapshot_date DATE NOT NULL, snapshot_type VARCHAR(20) NOT NULL, data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, snapshot_date, snapshot_type)
);

-- ============================================================
-- 6. SCHEMA: admin
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), backup_type VARCHAR(20) NOT NULL,
    backup_name VARCHAR(255) NOT NULL, file_path VARCHAR(500) NOT NULL, file_size_bytes BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS', error_message TEXT,
    created_by VARCHAR(50) NOT NULL, duration_ms INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin.sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sync_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS', entities_synced JSONB,
    total_records_synced INT DEFAULT 0, total_records_failed INT DEFAULT 0, error_message TEXT,
    triggered_by VARCHAR(50) NOT NULL, duration_ms INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. SCHEMA: governance
-- ============================================================
CREATE TABLE IF NOT EXISTS governance.project_accountability (
    project_id VARCHAR(36) PRIMARY KEY, primary_pm_user_id VARCHAR(36) NOT NULL,
    co_pm_user_id VARCHAR(36) NULL, sponsor_user_id VARCHAR(36) NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by VARCHAR(36) NOT NULL
);
CREATE TABLE IF NOT EXISTS governance.accountability_change_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('PM_CHANGE','CO_PM_CHANGE','SPONSOR_CHANGE')),
    previous_user_id VARCHAR(36) NULL, new_user_id VARCHAR(36) NULL,
    changed_by VARCHAR(36) NOT NULL, change_reason TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS governance.roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NULL,
    code TEXT NOT NULL, name TEXT NOT NULL, description TEXT NULL,
    is_project_scoped BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by VARCHAR(36) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_scope_code ON governance.roles(COALESCE(project_id, '00000000-0000-0000-0000-000000000000'), code);

CREATE TABLE IF NOT EXISTS governance.capabilities (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, category TEXT NOT NULL CHECK (category IN ('APPROVAL','MANAGEMENT','VIEW','EXECUTION','GOVERNANCE')),
    description TEXT NULL, is_delegatable BOOLEAN NOT NULL DEFAULT false,
    allow_redelegation BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by VARCHAR(36) NOT NULL
);
CREATE TABLE IF NOT EXISTS governance.role_capabilities (
    role_id VARCHAR(36) NOT NULL, capability_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, capability_id),
    FOREIGN KEY (role_id) REFERENCES governance.roles(id) ON DELETE CASCADE,
    FOREIGN KEY (capability_id) REFERENCES governance.capabilities(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS governance.user_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL, role_id VARCHAR(36) NOT NULL,
    granted_by VARCHAR(36) NOT NULL, granted_at TIMESTAMPTZ NOT NULL DEFAULT now(), reason TEXT NULL,
    FOREIGN KEY (role_id) REFERENCES governance.roles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_roles_project_user ON governance.user_roles(project_id, user_id);

CREATE TABLE IF NOT EXISTS governance.user_capabilities (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL, capability_id VARCHAR(36) NOT NULL,
    granted_by VARCHAR(36) NOT NULL, granted_at TIMESTAMPTZ NOT NULL DEFAULT now(), reason TEXT NULL,
    FOREIGN KEY (capability_id) REFERENCES governance.capabilities(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_cap_project_user_cap ON governance.user_capabilities(project_id, user_id, capability_id);

CREATE TABLE IF NOT EXISTS governance.delegations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    delegator_id VARCHAR(36) NOT NULL, delegatee_id VARCHAR(36) NOT NULL,
    capability_id VARCHAR(36) NOT NULL,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('PROJECT','PART','FUNCTION')),
    scope_part_id VARCHAR(36) NULL, scope_function_desc TEXT NULL,
    duration_type TEXT NOT NULL CHECK (duration_type IN ('PERMANENT','TEMPORARY')),
    start_at DATE NOT NULL, end_at DATE NULL,
    approver_id VARCHAR(36) NOT NULL, approved_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE','EXPIRED','REVOKED','PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by VARCHAR(36) NOT NULL,
    revoked_at TIMESTAMPTZ NULL, revoked_by VARCHAR(36) NULL, revoke_reason TEXT NULL,
    parent_delegation_id VARCHAR(36) NULL,
    FOREIGN KEY (capability_id) REFERENCES governance.capabilities(id),
    FOREIGN KEY (parent_delegation_id) REFERENCES governance.delegations(id) ON DELETE SET NULL,
    CONSTRAINT chk_temp_end_required CHECK ((duration_type = 'TEMPORARY' AND end_at IS NOT NULL) OR (duration_type = 'PERMANENT')),
    CONSTRAINT chk_no_self_approval CHECK (approver_id <> delegator_id)
);
CREATE INDEX IF NOT EXISTS idx_delegations_project_status ON governance.delegations(project_id, status);

CREATE TABLE IF NOT EXISTS governance.permission_audit_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    actor_id VARCHAR(36) NOT NULL, action_type TEXT NOT NULL, target_type TEXT NOT NULL,
    target_id VARCHAR(36) NOT NULL, reason TEXT NULL, payload_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS governance.sod_rules (
    id VARCHAR(36) PRIMARY KEY, capability_a_id VARCHAR(36) NOT NULL, capability_b_id VARCHAR(36) NOT NULL,
    description TEXT NOT NULL, severity TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
    is_blocking BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (capability_a_id) REFERENCES governance.capabilities(id),
    FOREIGN KEY (capability_b_id) REFERENCES governance.capabilities(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sod_pair ON governance.sod_rules(LEAST(capability_a_id, capability_b_id), GREATEST(capability_a_id, capability_b_id));

CREATE TABLE IF NOT EXISTS governance.governance_check_runs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(), checked_by VARCHAR(36) NULL,
    summary_json JSONB NOT NULL DEFAULT '{}'::JSONB
);
CREATE TABLE IF NOT EXISTS governance.governance_findings (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, run_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    finding_type TEXT NOT NULL CHECK (finding_type IN ('SOD_VIOLATION','SELF_APPROVAL','EXPIRING_SOON','EXPIRED','DUPLICATE_CAP','ORPHAN_DELEGATION')),
    severity TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW','INFO')),
    user_id VARCHAR(36) NULL, delegation_id VARCHAR(36) NULL, message TEXT NOT NULL,
    details_json JSONB NOT NULL DEFAULT '{}'::JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (run_id) REFERENCES governance.governance_check_runs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS governance.outbox_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, aggregate_type TEXT NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL, event_type TEXT NOT NULL, project_id VARCHAR(36) NOT NULL,
    payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_gov_outbox_unprocessed ON governance.outbox_events(processed_at) WHERE processed_at IS NULL;

-- ============================================================
-- 8. SCHEMA: organization
-- ============================================================
CREATE TABLE IF NOT EXISTS organization.parts (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    name TEXT NOT NULL,
    part_type TEXT NOT NULL CHECK (part_type IN ('AI_DEVELOPMENT','SI_DEVELOPMENT','QA','BUSINESS_ANALYSIS','COMMON','PMO','CUSTOM')),
    custom_type_name TEXT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
    leader_user_id VARCHAR(36) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by VARCHAR(36) NOT NULL,
    closed_at TIMESTAMPTZ NULL, closed_by VARCHAR(36) NULL,
    CONSTRAINT chk_custom_type_name CHECK ((part_type <> 'CUSTOM') OR (custom_type_name IS NOT NULL AND length(custom_type_name) > 0))
);
CREATE TABLE IF NOT EXISTS organization.part_co_leaders (
    part_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by VARCHAR(36) NOT NULL,
    PRIMARY KEY (part_id, user_id),
    FOREIGN KEY (part_id) REFERENCES organization.parts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS organization.part_memberships (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    part_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
    membership_type TEXT NOT NULL CHECK (membership_type IN ('PRIMARY','SECONDARY')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(), joined_by VARCHAR(36) NOT NULL,
    left_at TIMESTAMPTZ NULL, left_by VARCHAR(36) NULL,
    FOREIGN KEY (part_id) REFERENCES organization.parts(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_membership ON organization.part_memberships(project_id, user_id) WHERE left_at IS NULL AND membership_type = 'PRIMARY';

CREATE TABLE IF NOT EXISTS organization.assignment_change_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, project_id VARCHAR(36) NOT NULL,
    part_id VARCHAR(36) NULL, user_id VARCHAR(36) NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('MEMBERSHIP_ADD','MEMBERSHIP_REMOVE','PRIMARY_SWITCH','LEADER_CHANGE','PART_CLOSE','PART_OPEN')),
    previous_value TEXT NULL, new_value TEXT NULL,
    changed_by VARCHAR(36) NOT NULL, change_reason TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. SCHEMA: audit
-- ============================================================
CREATE TABLE IF NOT EXISTS audit.status_transition_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id VARCHAR(36), project_id VARCHAR(36),
    entity_type VARCHAR(32) NOT NULL, entity_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(32), to_status VARCHAR(32) NOT NULL,
    changed_by VARCHAR(36), change_source VARCHAR(32) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(), metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_transition_entity_time ON audit.status_transition_events(entity_type, entity_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_transition_project_time ON audit.status_transition_events(project_id, changed_at);

CREATE TABLE IF NOT EXISTS audit.data_quality_snapshots (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score NUMERIC(5,1) NOT NULL, grade VARCHAR(1) NOT NULL,
    integrity_score NUMERIC(5,1) NOT NULL, readiness_score NUMERIC(5,1) NOT NULL,
    traceability_score NUMERIC(5,1) NOT NULL, metrics_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(), UNIQUE(project_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS audit.evidence_packages (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, requested_by VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', package_type VARCHAR(10) NOT NULL DEFAULT 'ZIP',
    filter_snapshot JSONB, selection_ids JSONB, total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0, file_path VARCHAR(500), file_size_bytes BIGINT,
    download_url VARCHAR(500), download_expires_at TIMESTAMPTZ, sealed_at TIMESTAMPTZ,
    selection_hash VARCHAR(64), error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS audit.evidence_audit_trail (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, event_type VARCHAR(30) NOT NULL,
    package_id VARCHAR(36), evidence_ids JSONB, filter_snapshot JSONB,
    ip_address VARCHAR(45), proxy_ip VARCHAR(45), user_agent VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. SCHEMA: ai
-- ============================================================
CREATE TABLE IF NOT EXISTS ai.decision_trace_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, user_role VARCHAR(50) NOT NULL,
    event_type VARCHAR(30) NOT NULL, briefing_id VARCHAR(36) NOT NULL,
    insight_id VARCHAR(36), insight_type VARCHAR(50), severity VARCHAR(20),
    confidence DECIMAL(3,2), action_id VARCHAR(50), action_result VARCHAR(20),
    generation_method VARCHAR(20), completeness VARCHAR(10), data_sources JSONB,
    evidence_json JSONB, as_of TIMESTAMPTZ, generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action_clicked_at TIMESTAMPTZ, action_completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_trace_project ON ai.decision_trace_log(project_id, generated_at);

CREATE TABLE IF NOT EXISTS ai.briefing_cache (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL, role VARCHAR(50) NOT NULL, scope VARCHAR(30) NOT NULL,
    as_of TIMESTAMPTZ NOT NULL, completeness VARCHAR(10) NOT NULL,
    generation_method VARCHAR(20) NOT NULL, response_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_briefing_cache UNIQUE(project_id, role, scope)
);

-- ============================================================
-- 11. SCHEMA: rfp (extensions)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfp.origin_policies (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL UNIQUE,
    origin_type VARCHAR(30) NOT NULL CHECK (origin_type IN ('EXTERNAL_RFP','INTERNAL_INITIATIVE','MODERNIZATION','MIXED')),
    require_source_rfp_id BOOLEAN NOT NULL DEFAULT true,
    evidence_level VARCHAR(10) NOT NULL DEFAULT 'FULL' CHECK (evidence_level IN ('FULL','PARTIAL')),
    change_approval_required BOOLEAN NOT NULL DEFAULT true,
    auto_analysis_enabled BOOLEAN NOT NULL DEFAULT true,
    lineage_enforcement VARCHAR(10) NOT NULL DEFAULT 'STRICT' CHECK (lineage_enforcement IN ('STRICT','RELAXED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(36), updated_by VARCHAR(36)
);
CREATE TABLE IF NOT EXISTS rfp.rfp_versions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    version_label VARCHAR(20) NOT NULL, file_name VARCHAR(255), file_path VARCHAR(500),
    file_type VARCHAR(50), file_size BIGINT, checksum VARCHAR(100),
    uploaded_by VARCHAR(36), uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rfp.rfp_document_chunks (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    version_id VARCHAR(36) REFERENCES rfp.rfp_versions(id) ON DELETE SET NULL,
    section_id VARCHAR(50), paragraph_id VARCHAR(50), chunk_order INTEGER NOT NULL DEFAULT 0,
    heading VARCHAR(500), content TEXT NOT NULL, page_number INTEGER,
    chunk_type VARCHAR(30) DEFAULT 'PARAGRAPH' CHECK (chunk_type IN ('HEADING','PARAGRAPH','TABLE','LIST','FIGURE')),
    token_count INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rfp.rfp_extraction_runs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    rfp_version_id VARCHAR(36) REFERENCES rfp.rfp_versions(id) ON DELETE SET NULL,
    model_name VARCHAR(100) NOT NULL, model_version VARCHAR(50), prompt_version VARCHAR(20),
    schema_version VARCHAR(20) DEFAULT 'v1.0', generation_params JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
    is_active BOOLEAN NOT NULL DEFAULT false, total_candidates INTEGER DEFAULT 0,
    ambiguity_count INTEGER DEFAULT 0, avg_confidence DECIMAL(3,2) DEFAULT 0,
    category_breakdown JSONB, error_message TEXT,
    started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(36)
);
CREATE TABLE IF NOT EXISTS rfp.rfp_requirement_candidates (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    extraction_run_id VARCHAR(36) NOT NULL REFERENCES rfp.rfp_extraction_runs(id) ON DELETE CASCADE,
    rfp_id VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    req_key VARCHAR(50) NOT NULL, text TEXT NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'FUNCTIONAL' CHECK (category IN ('FUNCTIONAL','NON_FUNCTIONAL','CONSTRAINT')),
    priority_hint VARCHAR(20) DEFAULT 'UNKNOWN' CHECK (priority_hint IN ('MUST','SHOULD','COULD','UNKNOWN')),
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0, source_section VARCHAR(100),
    source_paragraph_id VARCHAR(100), source_quote VARCHAR(500),
    is_ambiguous BOOLEAN NOT NULL DEFAULT false, ambiguity_questions JSONB DEFAULT '[]'::jsonb,
    duplicate_refs JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','ACCEPTED','REJECTED','EDITED')),
    edited_text TEXT, reviewed_by VARCHAR(36), reviewed_at TIMESTAMPTZ,
    confirmed_requirement_id VARCHAR(36), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rfp.rfp_change_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    change_type VARCHAR(30) NOT NULL CHECK (change_type IN ('VERSION_UPLOAD','REANALYSIS','REQUIREMENT_CHANGE','STATUS_CHANGE')),
    reason TEXT, from_version_id VARCHAR(36), to_version_id VARCHAR(36),
    impact_snapshot JSONB, changed_by VARCHAR(36), changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. FUNCTIONS AND TRIGGERS
-- ============================================================

-- 12.1 Outbox idempotency key function + trigger
CREATE OR REPLACE FUNCTION project.generate_idempotency_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.idempotency_key IS NULL THEN
        NEW.idempotency_key := NEW.event_type || ':' || NEW.aggregate_id || ':' || EXTRACT(EPOCH FROM NEW.created_at)::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outbox_idempotency_key
    BEFORE INSERT ON project.outbox_events
    FOR EACH ROW EXECUTE FUNCTION project.generate_idempotency_key();

-- 12.2 Outbox cleanup function
CREATE OR REPLACE FUNCTION project.cleanup_old_outbox_events(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM project.outbox_events WHERE status = 'PUBLISHED' AND published_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 12.3 Deliverable outbox cleanup
CREATE OR REPLACE FUNCTION project.cleanup_old_deliverable_outbox_events(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM project.deliverable_outbox WHERE status = 'PROCESSED' AND processed_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 12.4 Dead letter functions
CREATE OR REPLACE FUNCTION project.move_to_dead_letter(outbox_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE event_record project.deliverable_outbox%ROWTYPE; error_hist JSONB;
BEGIN
    SELECT * INTO event_record FROM project.deliverable_outbox WHERE id = outbox_id AND status = 'FAILED';
    IF NOT FOUND THEN RETURN FALSE; END IF;
    error_hist := jsonb_build_array(jsonb_build_object('error', event_record.last_error, 'at', event_record.last_error_at));
    INSERT INTO project.deliverable_outbox_dead_letter (id, aggregate_type, aggregate_id, event_type, payload, stream_id, error_history, delivery_count, created_at, project_id)
    VALUES (event_record.id, event_record.aggregate_type, event_record.aggregate_id, event_record.event_type, event_record.payload, event_record.stream_id, error_hist, event_record.retry_count + 1, event_record.created_at, event_record.project_id);
    DELETE FROM project.deliverable_outbox WHERE id = outbox_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION project.retry_dead_letter(dead_letter_id VARCHAR(50), retry_user VARCHAR(100) DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE dl_record project.deliverable_outbox_dead_letter%ROWTYPE;
BEGIN
    SELECT * INTO dl_record FROM project.deliverable_outbox_dead_letter WHERE id = dead_letter_id AND resolution_status = 'UNRESOLVED';
    IF NOT FOUND THEN RETURN FALSE; END IF;
    UPDATE project.deliverable_outbox_dead_letter SET resolution_status = 'RETRYING', resolved_by = retry_user, resolved_at = CURRENT_TIMESTAMP WHERE id = dead_letter_id;
    INSERT INTO project.deliverable_outbox (id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, max_retries, project_id, created_at)
    VALUES (gen_random_uuid()::VARCHAR, dl_record.aggregate_type, dl_record.aggregate_id, dl_record.event_type, dl_record.payload, 'PENDING', 0, 3, dl_record.project_id, CURRENT_TIMESTAMP);
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 12.5 Part effective ID function
CREATE OR REPLACE FUNCTION project.get_effective_part_id(p_entity_type VARCHAR, p_entity_id VARCHAR, p_as_of TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
RETURNS VARCHAR AS $$
BEGIN
    RETURN (SELECT new_part_id FROM project.part_change_history WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND effective_from <= p_as_of AND (effective_to IS NULL OR effective_to > p_as_of) ORDER BY effective_from DESC LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- 12.6 Report update_updated_at trigger function
CREATE OR REPLACE FUNCTION report.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON report.reports FOR EACH ROW EXECUTE FUNCTION report.update_updated_at_column();
CREATE TRIGGER update_role_report_defaults_updated_at BEFORE UPDATE ON report.role_report_defaults FOR EACH ROW EXECUTE FUNCTION report.update_updated_at_column();
CREATE TRIGGER update_report_comments_updated_at BEFORE UPDATE ON report.report_comments FOR EACH ROW EXECUTE FUNCTION report.update_updated_at_column();
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report.report_templates FOR EACH ROW EXECUTE FUNCTION report.update_updated_at_column();
CREATE TRIGGER update_user_template_preferences_updated_at BEFORE UPDATE ON report.user_template_preferences FOR EACH ROW EXECUTE FUNCTION report.update_updated_at_column();
CREATE TRIGGER update_user_report_settings_updated_at BEFORE UPDATE ON report.user_report_settings FOR EACH ROW EXECUTE FUNCTION report.update_updated_at_column();
CREATE TRIGGER update_scheduled_report_jobs_updated_at BEFORE UPDATE ON report.scheduled_report_jobs FOR EACH ROW EXECUTE FUNCTION report.update_updated_at_column();

-- 12.7 Report cleanup and schedule functions
CREATE OR REPLACE FUNCTION report.cleanup_old_logs(days_to_keep INT DEFAULT 90)
RETURNS INT AS $$
DECLARE deleted_count INT;
BEGIN
    WITH deleted AS (DELETE FROM report.text_to_sql_logs WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL RETURNING id)
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    DELETE FROM report.report_generation_logs WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION report.calculate_next_schedule(is_enabled BOOLEAN, day_of_week_or_month INT, schedule_time TIME, schedule_type VARCHAR(20))
RETURNS TIMESTAMP AS $$
DECLARE next_date DATE; next_ts TIMESTAMP;
BEGIN
    IF NOT is_enabled THEN RETURN NULL; END IF;
    IF schedule_type = 'WEEKLY' THEN
        next_date := CURRENT_DATE + ((day_of_week_or_month - EXTRACT(DOW FROM CURRENT_DATE)::INT + 7) % 7);
        IF next_date = CURRENT_DATE AND CURRENT_TIME > schedule_time THEN next_date := next_date + 7; END IF;
    ELSIF schedule_type = 'MONTHLY' THEN
        next_date := DATE_TRUNC('month', CURRENT_DATE)::DATE + (day_of_week_or_month - 1);
        IF next_date < CURRENT_DATE OR (next_date = CURRENT_DATE AND CURRENT_TIME > schedule_time) THEN
            next_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE + (day_of_week_or_month - 1);
        END IF;
    ELSE RETURN NULL;
    END IF;
    RETURN next_date + schedule_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. VIEWS
-- ============================================================

-- 13.1 Governance effective capabilities
CREATE OR REPLACE VIEW governance.v_role_caps AS
SELECT ur.project_id, ur.user_id, rc.capability_id, 'ROLE'::TEXT AS source_type, ur.role_id AS source_id
FROM governance.user_roles ur JOIN governance.role_capabilities rc ON rc.role_id = ur.role_id;

CREATE OR REPLACE VIEW governance.v_direct_caps AS
SELECT uc.project_id, uc.user_id, uc.capability_id, 'DIRECT'::TEXT AS source_type, uc.id AS source_id
FROM governance.user_capabilities uc;

CREATE OR REPLACE VIEW governance.v_delegated_caps AS
SELECT d.project_id, d.delegatee_id AS user_id, d.capability_id, 'DELEGATION'::TEXT AS source_type, d.id AS source_id
FROM governance.delegations d
WHERE d.status = 'ACTIVE' AND d.start_at <= current_date AND (d.duration_type = 'PERMANENT' OR d.end_at >= current_date);

CREATE OR REPLACE VIEW governance.v_effective_caps AS
SELECT DISTINCT ON (project_id, user_id, capability_id) project_id, user_id, capability_id, source_type, source_id
FROM (
    SELECT * FROM governance.v_delegated_caps UNION ALL SELECT * FROM governance.v_direct_caps UNION ALL SELECT * FROM governance.v_role_caps
) s
ORDER BY project_id, user_id, capability_id,
    CASE source_type WHEN 'DELEGATION' THEN 1 WHEN 'DIRECT' THEN 2 WHEN 'ROLE' THEN 3 ELSE 9 END;

-- 13.2 Part-based views
CREATE OR REPLACE VIEW project.part_backlog_summary AS
SELECT p.id as part_id, p.name as part_name, p.project_id, p.leader_id as pl_user_id,
    COUNT(DISTINCT f.id) as feature_count, COUNT(DISTINCT us.id) as story_count,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT CASE WHEN us.status = 'DONE' THEN us.id END) as completed_stories,
    COUNT(DISTINCT CASE WHEN us.status = 'IN_PROGRESS' THEN us.id END) as in_progress_stories,
    COUNT(DISTINCT CASE WHEN t.status = 'BLOCKED' THEN t.id END) as blocked_tasks,
    COALESCE(SUM(CASE WHEN us.status = 'DONE' THEN us.story_points ELSE 0 END), 0) as completed_story_points,
    COALESCE(SUM(us.story_points), 0) as total_story_points
FROM project.parts p LEFT JOIN project.features f ON f.part_id = p.id
LEFT JOIN task.user_stories us ON us.part_id = p.id LEFT JOIN task.tasks t ON t.part_id = p.id
GROUP BY p.id, p.name, p.project_id, p.leader_id;

CREATE OR REPLACE VIEW project.current_part_assignments AS
SELECT entity_type, entity_id, entity_name, new_part_id AS current_part_id,
    new_part_name AS current_part_name, project_id, effective_from AS assigned_at,
    changed_by_user_name AS assigned_by
FROM project.part_change_history WHERE effective_to IS NULL ORDER BY effective_from DESC;

-- 13.3 Integrity monitoring views
CREATE OR REPLACE VIEW task.v_orphan_part_ref AS
SELECT t.id, t.title, t.part_id, 'task.tasks' AS source_table FROM task.tasks t
WHERE t.part_id IS NOT NULL AND t.part_id NOT IN (SELECT id FROM project.parts)
UNION ALL
SELECT us.id, us.title, us.part_id, 'task.user_stories' FROM task.user_stories us
WHERE us.part_id IS NOT NULL AND us.part_id NOT IN (SELECT id FROM project.parts);

CREATE OR REPLACE VIEW task.v_orphan_epic_ref AS
SELECT us.id, us.title, us.epic_id, us.epic AS epic_text FROM task.user_stories us
WHERE us.epic_id IS NOT NULL AND us.epic_id NOT IN (SELECT id FROM project.epics);

CREATE OR REPLACE VIEW project.v_orphan_requirement_ref AS
SELECT bi.id, bi.requirement_id, bi.status FROM project.backlog_items bi
WHERE bi.requirement_id IS NOT NULL AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

CREATE OR REPLACE VIEW task.v_mismatch_story_feature_part AS
SELECT us.id AS story_id, us.title AS story_title, us.feature_id, us.part_id AS story_part, f.part_id AS feature_part
FROM task.user_stories us JOIN project.features f ON us.feature_id = f.id
WHERE us.part_id IS DISTINCT FROM f.part_id;

CREATE OR REPLACE VIEW task.v_mismatch_story_epic_text AS
SELECT us.id AS story_id, us.title AS story_title, us.epic_id, us.epic AS epic_text, e.name AS epic_name
FROM task.user_stories us JOIN project.epics e ON us.epic_id = e.id
WHERE us.epic IS DISTINCT FROM e.name;

CREATE OR REPLACE VIEW task.v_orphan_backlog_item_ref AS
SELECT us.id AS story_id, us.backlog_item_id FROM task.user_stories us
WHERE us.backlog_item_id IS NOT NULL AND us.backlog_item_id NOT IN (SELECT id FROM project.backlog_items);

CREATE OR REPLACE VIEW task.v_multi_requirement_stories AS
SELECT user_story_id, COUNT(DISTINCT requirement_id) AS req_count
FROM task.user_story_requirement_links GROUP BY user_story_id HAVING COUNT(DISTINCT requirement_id) > 1;

CREATE OR REPLACE VIEW project.v_dup_backlog_requirement AS
SELECT backlog_id, requirement_id, COUNT(*) AS cnt FROM project.backlog_items
WHERE requirement_id IS NOT NULL GROUP BY backlog_id, requirement_id HAVING COUNT(*) > 1;

-- 13.4 Report views
CREATE OR REPLACE VIEW report.v_user_next_scheduled_reports AS
SELECT s.user_id, s.project_id,
    CASE WHEN s.weekly_enabled THEN (CURRENT_DATE + ((s.weekly_day_of_week - EXTRACT(DOW FROM CURRENT_DATE)::INT + 7) % 7)) + s.weekly_time ELSE NULL END as next_weekly_at,
    CASE WHEN s.monthly_enabled THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (s.monthly_day_of_month - 1) * INTERVAL '1 day')::DATE + s.monthly_time ELSE NULL END as next_monthly_at
FROM report.user_report_settings s;

CREATE OR REPLACE VIEW report.v_generation_statistics AS
SELECT user_id, DATE_TRUNC('week', created_at) as week, generation_mode, status,
    COUNT(*) as count, AVG(total_duration_ms) as avg_duration_ms, SUM(llm_tokens_used) as total_tokens
FROM report.report_generation_logs GROUP BY user_id, DATE_TRUNC('week', created_at), generation_mode, status;

-- 13.5 Part weekly report summary
CREATE OR REPLACE VIEW task.part_weekly_report_summary AS
SELECT wr.id, wr.project_id, wr.part_id, p.name as part_name, p.leader_id as pl_user_id,
    p.leader_name as pl_name, wr.week_start_date, wr.week_end_date,
    wr.total_tasks, wr.completed_tasks, wr.in_progress_tasks, wr.blocked_tasks,
    wr.story_points_completed, wr.story_points_in_progress, wr.story_points_planned,
    wr.summary, wr.scope_type, wr.created_at
FROM task.weekly_reports wr LEFT JOIN project.parts p ON wr.part_id = p.id
WHERE wr.part_id IS NOT NULL;

-- ============================================================
-- END OF SCHEMA DDL
-- ============================================================
