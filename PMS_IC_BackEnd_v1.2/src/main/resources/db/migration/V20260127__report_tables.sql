-- ============================================================
-- Phase G: Report System - Main Tables
-- Migration: V20260127__report_tables.sql
-- Description: Report main tables and metrics history
-- ============================================================

-- Create report schema
CREATE SCHEMA IF NOT EXISTS report;

-- ============================================================
-- 1. Reports Main Table
-- ============================================================
CREATE TABLE report.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic information
    project_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL,      -- WEEKLY, MONTHLY, QUARTERLY
    report_scope VARCHAR(30) NOT NULL,     -- PROJECT, PHASE, TEAM, INDIVIDUAL
    title VARCHAR(500),

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Scope specification (based on role)
    scope_phase_id VARCHAR(50),            -- PHASE scope
    scope_team_id VARCHAR(50),             -- TEAM scope
    scope_user_id VARCHAR(50),             -- INDIVIDUAL scope

    -- Creation information
    created_by VARCHAR(50) NOT NULL,
    creator_role VARCHAR(30) NOT NULL,
    generation_mode VARCHAR(20) NOT NULL,  -- AUTO, MANUAL
    template_id UUID,                       -- Used template

    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT',    -- DRAFT, PUBLISHED, ARCHIVED

    -- Content
    content JSONB NOT NULL,                -- Actual report content

    -- Metrics snapshot
    metrics_snapshot JSONB,                -- Metrics at generation time

    -- LLM metadata
    llm_generated_sections TEXT[],
    llm_model VARCHAR(100),
    llm_confidence_score DECIMAL(3,2),

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,

    CONSTRAINT fk_report_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE
);

-- Indexes for reports
CREATE INDEX idx_reports_project ON report.reports(project_id);
CREATE INDEX idx_reports_creator ON report.reports(created_by);
CREATE INDEX idx_reports_period ON report.reports(period_start, period_end);
CREATE INDEX idx_reports_type_scope ON report.reports(report_type, report_scope);
CREATE INDEX idx_reports_status ON report.reports(status);
CREATE INDEX idx_reports_created_at ON report.reports(created_at DESC);

-- ============================================================
-- 2. Time-Series Metrics History Table
-- ============================================================
CREATE TABLE report.report_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(50) NOT NULL,

    -- Time dimension
    metric_date DATE NOT NULL,
    report_type VARCHAR(20) NOT NULL,      -- WEEKLY, MONTHLY
    fiscal_year INT,
    fiscal_quarter INT,
    fiscal_month INT,
    fiscal_week INT,

    -- Task metrics
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    in_progress_tasks INT DEFAULT 0,
    blocked_tasks INT DEFAULT 0,
    delayed_tasks INT DEFAULT 0,

    -- Performance metrics
    completion_rate DECIMAL(5,2),
    velocity DECIMAL(10,2),
    story_points_completed INT DEFAULT 0,
    story_points_planned INT DEFAULT 0,

    -- Quality metrics
    bug_count INT DEFAULT 0,
    bug_resolved INT DEFAULT 0,
    test_coverage DECIMAL(5,2),

    -- Scope (optional)
    scope_type VARCHAR(30),                -- PROJECT, PHASE, TEAM, USER
    scope_id VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, metric_date, report_type, scope_type, scope_id)
);

CREATE INDEX idx_metrics_project_date ON report.report_metrics_history(project_id, metric_date);
CREATE INDEX idx_metrics_fiscal ON report.report_metrics_history(fiscal_year, fiscal_quarter, fiscal_month);
CREATE INDEX idx_metrics_scope ON report.report_metrics_history(scope_type, scope_id);

-- ============================================================
-- 3. Role-based Default Report Settings Table
-- ============================================================
CREATE TABLE report.role_report_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    role VARCHAR(30) NOT NULL,
    report_type VARCHAR(30) NOT NULL,

    default_scope VARCHAR(30) NOT NULL,
    default_sections TEXT[] NOT NULL,

    can_change_scope BOOLEAN DEFAULT false,
    can_select_sections BOOLEAN DEFAULT true,
    can_extend_period BOOLEAN DEFAULT false,
    max_period_days INT DEFAULT 7,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(role, report_type)
);

-- Insert default role configurations
INSERT INTO report.role_report_defaults
(role, report_type, default_scope, default_sections, can_change_scope, can_select_sections, max_period_days)
VALUES
('sponsor', 'WEEKLY', 'PROJECT',
 ARRAY['executive_summary', 'kpi_overview', 'risks_issues', 'budget_status'],
 true, true, 30),
('pmo_head', 'WEEKLY', 'PROJECT',
 ARRAY['executive_summary', 'progress_overview', 'team_performance', 'risks_issues', 'resource_status'],
 true, true, 30),
('pm', 'WEEKLY', 'PROJECT',
 ARRAY['executive_summary', 'progress_overview', 'phase_status', 'team_performance', 'issues_risks', 'next_week_plan'],
 true, true, 14),
('team_lead', 'WEEKLY', 'TEAM',
 ARRAY['team_summary', 'member_status', 'completed_work', 'blockers', 'next_week'],
 true, true, 7),
('developer', 'WEEKLY', 'INDIVIDUAL',
 ARRAY['my_summary', 'completed_tasks', 'in_progress', 'blockers', 'next_week_plan'],
 false, true, 7),
('qa', 'WEEKLY', 'INDIVIDUAL',
 ARRAY['my_summary', 'test_status', 'bugs_found', 'bugs_verified', 'next_week_plan'],
 false, true, 7),
('business_analyst', 'WEEKLY', 'PROJECT',
 ARRAY['requirement_summary', 'story_mapping_status', 'changes', 'next_week_plan'],
 false, true, 7),
('auditor', 'WEEKLY', 'PROJECT',
 ARRAY['compliance_summary', 'deliverables_status', 'audit_findings'],
 false, false, 30);

-- Monthly report defaults
INSERT INTO report.role_report_defaults
(role, report_type, default_scope, default_sections, can_change_scope, can_select_sections, max_period_days)
VALUES
('sponsor', 'MONTHLY', 'PROJECT',
 ARRAY['executive_summary', 'kpi_trends', 'milestone_status', 'budget_analysis', 'strategic_risks'],
 true, true, 90),
('pmo_head', 'MONTHLY', 'PROJECT',
 ARRAY['executive_summary', 'progress_trends', 'resource_utilization', 'quality_metrics', 'forecast'],
 true, true, 90),
('pm', 'MONTHLY', 'PROJECT',
 ARRAY['executive_summary', 'phase_progress', 'team_performance_trends', 'issues_resolution', 'next_month_plan'],
 true, true, 45);

-- ============================================================
-- 4. Report Comments Table
-- ============================================================
CREATE TABLE report.report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report.reports(id) ON DELETE CASCADE,

    user_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,

    parent_comment_id UUID REFERENCES report.report_comments(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_comments_report ON report.report_comments(report_id);
CREATE INDEX idx_report_comments_user ON report.report_comments(user_id);

-- ============================================================
-- 5. Report Shares Table
-- ============================================================
CREATE TABLE report.report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report.reports(id) ON DELETE CASCADE,

    shared_with_user_id VARCHAR(50),
    shared_with_team_id VARCHAR(50),
    shared_with_role VARCHAR(30),

    permission VARCHAR(20) DEFAULT 'VIEW',  -- VIEW, COMMENT, EDIT

    shared_by VARCHAR(50) NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    CONSTRAINT chk_share_target CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_team_id IS NULL AND shared_with_role IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_team_id IS NOT NULL AND shared_with_role IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_team_id IS NULL AND shared_with_role IS NOT NULL)
    )
);

CREATE INDEX idx_report_shares_report ON report.report_shares(report_id);
CREATE INDEX idx_report_shares_user ON report.report_shares(shared_with_user_id);
CREATE INDEX idx_report_shares_team ON report.report_shares(shared_with_team_id);

-- ============================================================
-- 6. Add update timestamp trigger
-- ============================================================
CREATE OR REPLACE FUNCTION report.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON report.reports
    FOR EACH ROW
    EXECUTE FUNCTION report.update_updated_at_column();

CREATE TRIGGER update_role_report_defaults_updated_at
    BEFORE UPDATE ON report.role_report_defaults
    FOR EACH ROW
    EXECUTE FUNCTION report.update_updated_at_column();

CREATE TRIGGER update_report_comments_updated_at
    BEFORE UPDATE ON report.report_comments
    FOR EACH ROW
    EXECUTE FUNCTION report.update_updated_at_column();
