-- V20260236_02: Test Management tables (Suite, Case, Run, Step)
-- Design spec: 10_test_management v2.0

CREATE SCHEMA IF NOT EXISTS task;

-- ============================================================
-- 1. Test Suites
-- ============================================================
CREATE TABLE IF NOT EXISTS task.test_suites (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    suite_type          VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
        -- GENERAL, REGRESSION, SMOKE, INTEGRATION, E2E, UAT
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        -- ACTIVE, ARCHIVED
    phase_id            VARCHAR(36),
    owner_id            VARCHAR(36),
    order_num           INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_ts_project ON task.test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_ts_phase ON task.test_suites(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ts_status ON task.test_suites(status);

COMMENT ON TABLE task.test_suites IS 'Test suite grouping for test cases';
COMMENT ON COLUMN task.test_suites.suite_type IS 'GENERAL, REGRESSION, SMOKE, INTEGRATION, E2E, UAT';

-- ============================================================
-- 2. Test Cases
-- ============================================================
CREATE TABLE IF NOT EXISTS task.test_cases (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    suite_id            VARCHAR(36) NOT NULL REFERENCES task.test_suites(id) ON DELETE CASCADE,
    test_case_code      VARCHAR(50) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    preconditions       TEXT,
    test_type           VARCHAR(30) DEFAULT 'MANUAL',
        -- MANUAL, AUTOMATED, HYBRID
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        -- CRITICAL, HIGH, MEDIUM, LOW
    definition_status   VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        -- DRAFT, READY, DEPRECATED (v2.0: 2-axis separation)
    last_outcome        VARCHAR(20) DEFAULT 'NOT_RUN',
        -- PASSED, FAILED, BLOCKED, SKIPPED, NOT_RUN (v2.0: derived from latest TestRun)
    derived_status      VARCHAR(30) GENERATED ALWAYS AS (
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
    assignee_id         VARCHAR(36),
    phase_id            VARCHAR(36),
    run_count           INTEGER DEFAULT 0,
    last_run_at         TIMESTAMPTZ,
    estimated_duration  INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    CONSTRAINT uq_tc_code_project UNIQUE(project_id, test_case_code)
);

CREATE INDEX IF NOT EXISTS idx_tc_project ON task.test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_tc_suite ON task.test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_tc_def_status ON task.test_cases(definition_status);
CREATE INDEX IF NOT EXISTS idx_tc_last_outcome ON task.test_cases(last_outcome);
CREATE INDEX IF NOT EXISTS idx_tc_priority ON task.test_cases(priority);
CREATE INDEX IF NOT EXISTS idx_tc_assignee ON task.test_cases(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tc_phase ON task.test_cases(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tc_project_suite_status ON task.test_cases(project_id, suite_id, definition_status);

COMMENT ON TABLE task.test_cases IS 'Individual test case definitions with 2-axis status model';
COMMENT ON COLUMN task.test_cases.definition_status IS 'Authoring lifecycle: DRAFT -> READY -> DEPRECATED';
COMMENT ON COLUMN task.test_cases.last_outcome IS 'Latest TestRun result: PASSED/FAILED/BLOCKED/SKIPPED/NOT_RUN';
COMMENT ON COLUMN task.test_cases.derived_status IS 'Server-computed display status from definition_status + last_outcome';

-- ============================================================
-- 3. Test Case Trace Links (Requirement / Story)
-- ============================================================
CREATE TABLE IF NOT EXISTS task.test_case_requirement_links (
    test_case_id        VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    requirement_id      VARCHAR(36) NOT NULL,
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by           VARCHAR(36),
    PRIMARY KEY (test_case_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_tcrl_req ON task.test_case_requirement_links(requirement_id);

CREATE TABLE IF NOT EXISTS task.test_case_story_links (
    test_case_id        VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    story_id            VARCHAR(36) NOT NULL,
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by           VARCHAR(36),
    PRIMARY KEY (test_case_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_tcsl_story ON task.test_case_story_links(story_id);

-- ============================================================
-- 4. Test Steps (ordered steps within a test case)
-- ============================================================
CREATE TABLE IF NOT EXISTS task.test_steps (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_case_id        VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    step_number         INTEGER NOT NULL,
    action              TEXT NOT NULL,
    expected_result     TEXT NOT NULL,
    test_data           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_step_order UNIQUE(test_case_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_tstep_tc ON task.test_steps(test_case_id);

-- ============================================================
-- 5. Test Runs (immutable execution snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS task.test_runs (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_case_id        VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    project_id          VARCHAR(36) NOT NULL,
    run_number          INTEGER NOT NULL,
    mode                VARCHAR(20) NOT NULL DEFAULT 'DETAILED',
        -- DETAILED (step-by-step), QUICK (bulk)
    result              VARCHAR(20) NOT NULL,
        -- PASSED, FAILED, BLOCKED, SKIPPED
    executor_id         VARCHAR(36) NOT NULL,
    environment         VARCHAR(50),
        -- DEV, STAGING, PRODUCTION, UAT
    started_at          TIMESTAMPTZ NOT NULL,
    finished_at         TIMESTAMPTZ,
    duration_seconds    INTEGER,
    notes               TEXT,
    defect_issue_id     VARCHAR(36),
    defect_create_status VARCHAR(20),
        -- null, PENDING, CREATED, FAILED (v2.0: idempotent defect creation)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_number UNIQUE(test_case_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_tr_tc ON task.test_runs(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tr_project ON task.test_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_tr_result ON task.test_runs(result);
CREATE INDEX IF NOT EXISTS idx_tr_executor ON task.test_runs(executor_id);
CREATE INDEX IF NOT EXISTS idx_tr_tc_created ON task.test_runs(test_case_id, created_at DESC);

COMMENT ON TABLE task.test_runs IS 'Immutable test execution snapshots (who, when, result, environment)';
COMMENT ON COLUMN task.test_runs.run_number IS 'Sequential per test_case_id, allocated via DB-level serialization';
COMMENT ON COLUMN task.test_runs.mode IS 'DETAILED = step-by-step, QUICK = bulk record (v2.0)';

-- ============================================================
-- 6. Test Run Step Results (per-step results within a run)
-- ============================================================
CREATE TABLE IF NOT EXISTS task.test_run_step_results (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_run_id         VARCHAR(36) NOT NULL REFERENCES task.test_runs(id) ON DELETE CASCADE,
    test_step_id        VARCHAR(36) NOT NULL REFERENCES task.test_steps(id) ON DELETE CASCADE,
    step_number         INTEGER NOT NULL,
    actual_result       TEXT,
    status              VARCHAR(20) NOT NULL,
        -- PASS, FAIL, BLOCKED, SKIPPED
    screenshot_path     VARCHAR(500),
    notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_trsr_run ON task.test_run_step_results(test_run_id);
