-- ============================================================
-- Phase G: Report System - User Settings and Logging Tables
-- Migration: V20260129__report_settings.sql
-- Description: User report settings, generation logs, and TextToSQL logs
-- ============================================================

-- ============================================================
-- 1. User Report Settings Table
-- ============================================================
CREATE TABLE report.user_report_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50),                -- NULL means all projects

    -- Weekly report settings
    weekly_enabled BOOLEAN DEFAULT false,
    weekly_day_of_week INT DEFAULT 1,      -- 1=Monday
    weekly_time TIME DEFAULT '09:00:00',
    weekly_template_id UUID REFERENCES report.report_templates(id) ON DELETE SET NULL,
    weekly_sections TEXT[],
    weekly_use_ai_summary BOOLEAN DEFAULT true,

    -- Monthly report settings
    monthly_enabled BOOLEAN DEFAULT false,
    monthly_day_of_month INT DEFAULT 1,
    monthly_time TIME DEFAULT '09:00:00',
    monthly_template_id UUID REFERENCES report.report_templates(id) ON DELETE SET NULL,
    monthly_sections TEXT[],
    monthly_use_ai_summary BOOLEAN DEFAULT true,

    -- Notification settings
    notify_on_complete BOOLEAN DEFAULT true,
    notify_email BOOLEAN DEFAULT false,
    notify_email_address VARCHAR(255),
    notify_slack BOOLEAN DEFAULT false,
    notify_slack_channel VARCHAR(100),

    -- Post-generation behavior
    auto_publish BOOLEAN DEFAULT false,    -- Auto-publish after generation
    edit_after_generate BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, project_id)
);

CREATE INDEX idx_settings_user ON report.user_report_settings(user_id);
CREATE INDEX idx_settings_weekly_schedule ON report.user_report_settings(weekly_enabled, weekly_day_of_week, weekly_time)
    WHERE weekly_enabled = true;
CREATE INDEX idx_settings_monthly_schedule ON report.user_report_settings(monthly_enabled, monthly_day_of_month, monthly_time)
    WHERE monthly_enabled = true;

-- ============================================================
-- 2. Report Generation Logs Table
-- ============================================================
CREATE TABLE report.report_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id VARCHAR(50) NOT NULL,
    report_id UUID REFERENCES report.reports(id) ON DELETE SET NULL,
    project_id VARCHAR(50),

    generation_mode VARCHAR(20) NOT NULL,  -- AUTO, MANUAL
    report_type VARCHAR(30),
    template_id UUID,

    status VARCHAR(20) NOT NULL,           -- SUCCESS, FAILED, PARTIAL
    error_message TEXT,
    error_details JSONB,

    -- Performance metrics
    data_collection_ms INT,
    llm_generation_ms INT,
    total_duration_ms INT,

    -- Metadata
    sections_generated TEXT[],
    sections_failed TEXT[],
    llm_model VARCHAR(100),
    llm_tokens_used INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gen_logs_user ON report.report_generation_logs(user_id);
CREATE INDEX idx_gen_logs_status ON report.report_generation_logs(status);
CREATE INDEX idx_gen_logs_date ON report.report_generation_logs(created_at DESC);
CREATE INDEX idx_gen_logs_mode ON report.report_generation_logs(generation_mode);

-- ============================================================
-- 3. TextToSQL Query Logs Table (Audit/Analysis)
-- ============================================================
CREATE TABLE report.text_to_sql_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50),
    user_role VARCHAR(30),

    -- Input/Output
    natural_language_query TEXT NOT NULL,
    generated_sql TEXT,
    sql_explanation TEXT,

    -- Execution result
    execution_status VARCHAR(20),          -- SUCCESS, FAILED, REJECTED
    result_count INT,
    error_message TEXT,

    -- Security
    was_sanitized BOOLEAN DEFAULT false,
    sanitization_notes TEXT,
    blocked_patterns TEXT[],

    -- Performance
    generation_ms INT,
    execution_ms INT,

    -- LLM metadata
    llm_model VARCHAR(100),
    llm_confidence DECIMAL(3,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sql_logs_user ON report.text_to_sql_logs(user_id);
CREATE INDEX idx_sql_logs_status ON report.text_to_sql_logs(execution_status);
CREATE INDEX idx_sql_logs_date ON report.text_to_sql_logs(created_at DESC);

-- ============================================================
-- 4. Scheduled Report Jobs Table
-- ============================================================
CREATE TABLE report.scheduled_report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50),
    settings_id UUID REFERENCES report.user_report_settings(id) ON DELETE CASCADE,

    report_type VARCHAR(30) NOT NULL,      -- WEEKLY, MONTHLY

    -- Schedule
    scheduled_at TIMESTAMP NOT NULL,
    executed_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, RUNNING, COMPLETED, FAILED
    report_id UUID REFERENCES report.reports(id) ON DELETE SET NULL,
    error_message TEXT,

    -- Retry
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_jobs_status ON report.scheduled_report_jobs(status);
CREATE INDEX idx_scheduled_jobs_time ON report.scheduled_report_jobs(scheduled_at)
    WHERE status = 'PENDING';
CREATE INDEX idx_scheduled_jobs_user ON report.scheduled_report_jobs(user_id);

-- ============================================================
-- 5. Report Data Snapshots Table (for trend analysis)
-- ============================================================
CREATE TABLE report.report_data_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id VARCHAR(50) NOT NULL,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(20) NOT NULL,    -- DAILY, WEEKLY, MONTHLY

    -- Aggregated data
    data JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, snapshot_date, snapshot_type)
);

CREATE INDEX idx_snapshots_project_date ON report.report_data_snapshots(project_id, snapshot_date);
CREATE INDEX idx_snapshots_type ON report.report_data_snapshots(snapshot_type);

-- ============================================================
-- 6. Update triggers
-- ============================================================
CREATE TRIGGER update_user_report_settings_updated_at
    BEFORE UPDATE ON report.user_report_settings
    FOR EACH ROW
    EXECUTE FUNCTION report.update_updated_at_column();

CREATE TRIGGER update_scheduled_report_jobs_updated_at
    BEFORE UPDATE ON report.scheduled_report_jobs
    FOR EACH ROW
    EXECUTE FUNCTION report.update_updated_at_column();

-- ============================================================
-- 7. Helper Views
-- ============================================================

-- View: User's next scheduled reports
CREATE OR REPLACE VIEW report.v_user_next_scheduled_reports AS
SELECT
    s.user_id,
    s.project_id,
    CASE
        WHEN s.weekly_enabled THEN
            (CURRENT_DATE + ((s.weekly_day_of_week - EXTRACT(DOW FROM CURRENT_DATE)::INT + 7) % 7)) + s.weekly_time
        ELSE NULL
    END as next_weekly_at,
    CASE
        WHEN s.monthly_enabled THEN
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (s.monthly_day_of_month - 1) * INTERVAL '1 day')::DATE + s.monthly_time
        ELSE NULL
    END as next_monthly_at
FROM report.user_report_settings s;

-- View: Report generation statistics
CREATE OR REPLACE VIEW report.v_generation_statistics AS
SELECT
    user_id,
    DATE_TRUNC('week', created_at) as week,
    generation_mode,
    status,
    COUNT(*) as count,
    AVG(total_duration_ms) as avg_duration_ms,
    SUM(llm_tokens_used) as total_tokens
FROM report.report_generation_logs
GROUP BY user_id, DATE_TRUNC('week', created_at), generation_mode, status;

-- ============================================================
-- 8. Cleanup job for old logs (optional, can be scheduled)
-- ============================================================
CREATE OR REPLACE FUNCTION report.cleanup_old_logs(days_to_keep INT DEFAULT 90)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM report.text_to_sql_logs
        WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    DELETE FROM report.report_generation_logs
    WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Function to calculate next scheduled time
-- ============================================================
CREATE OR REPLACE FUNCTION report.calculate_next_schedule(
    is_enabled BOOLEAN,
    day_of_week_or_month INT,
    schedule_time TIME,
    schedule_type VARCHAR(20)  -- 'WEEKLY' or 'MONTHLY'
)
RETURNS TIMESTAMP AS $$
DECLARE
    next_date DATE;
    next_ts TIMESTAMP;
BEGIN
    IF NOT is_enabled THEN
        RETURN NULL;
    END IF;

    IF schedule_type = 'WEEKLY' THEN
        -- Calculate next occurrence of the day of week
        next_date := CURRENT_DATE + ((day_of_week_or_month - EXTRACT(DOW FROM CURRENT_DATE)::INT + 7) % 7);
        IF next_date = CURRENT_DATE AND CURRENT_TIME > schedule_time THEN
            next_date := next_date + 7;
        END IF;
    ELSIF schedule_type = 'MONTHLY' THEN
        -- Calculate next occurrence of the day of month
        next_date := DATE_TRUNC('month', CURRENT_DATE)::DATE + (day_of_week_or_month - 1);
        IF next_date < CURRENT_DATE OR (next_date = CURRENT_DATE AND CURRENT_TIME > schedule_time) THEN
            next_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE + (day_of_week_or_month - 1);
        END IF;
    ELSE
        RETURN NULL;
    END IF;

    next_ts := next_date + schedule_time;
    RETURN next_ts;
END;
$$ LANGUAGE plpgsql;
