# Implementation Plan: Test Management Backend

> **Plan Version**: 1.0
> **Date**: 2026-02-10
> **Design Spec Reference**: `docs/10_menu/화면설계/10_테스트관리_화면설계.md` (v2.0)
> **Status**: NOT STARTED

---

## 1. Gap Summary

The Test Management screen (route `/tests`, `/tests/:testCaseId`) has a comprehensive v2.0 design spec covering a 3-tier lifecycle (TestSuite -> TestCase -> TestRun), but **no backend implementation exists**. There are:

- No database tables for test suites, test cases, test runs, or test steps
- No R2DBC entities, repositories, services, or controllers
- No API endpoints for test CRUD, execution, coverage, or defect linking
- No Flyway migration for the `task` schema test tables

The design spec defines 16 intents, 7 metrics, 12 FilterSpec keys, and a detailed 2-axis status model (definitionStatus + lastOutcome -> derivedStatus).

---

## 2. DB Schema Changes (Flyway Migration)

**File**: `V20260236_01__test_management_tables.sql`
**Schema**: `task`

```sql
-- V20260236_01: Test Management tables (Suite, Case, Run, Step)
-- Design spec: 10_테스트관리_화면설계.md v2.0

CREATE SCHEMA IF NOT EXISTS task;

-- ============================================================
-- 1. Test Suites
-- ============================================================
CREATE TABLE task.test_suites (
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

CREATE INDEX idx_ts_project ON task.test_suites(project_id);
CREATE INDEX idx_ts_phase ON task.test_suites(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_ts_status ON task.test_suites(status);

COMMENT ON TABLE task.test_suites IS 'Test suite grouping for test cases';
COMMENT ON COLUMN task.test_suites.suite_type IS 'GENERAL, REGRESSION, SMOKE, INTEGRATION, E2E, UAT';

-- ============================================================
-- 2. Test Cases
-- ============================================================
CREATE TABLE task.test_cases (
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
    estimated_duration  INTEGER,       -- in minutes
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    CONSTRAINT uq_tc_code_project UNIQUE(project_id, test_case_code)
);

CREATE INDEX idx_tc_project ON task.test_cases(project_id);
CREATE INDEX idx_tc_suite ON task.test_cases(suite_id);
CREATE INDEX idx_tc_def_status ON task.test_cases(definition_status);
CREATE INDEX idx_tc_last_outcome ON task.test_cases(last_outcome);
CREATE INDEX idx_tc_priority ON task.test_cases(priority);
CREATE INDEX idx_tc_assignee ON task.test_cases(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tc_phase ON task.test_cases(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_tc_project_suite_status ON task.test_cases(project_id, suite_id, definition_status);

COMMENT ON TABLE task.test_cases IS 'Individual test case definitions with 2-axis status model';
COMMENT ON COLUMN task.test_cases.definition_status IS 'Authoring lifecycle: DRAFT -> READY -> DEPRECATED';
COMMENT ON COLUMN task.test_cases.last_outcome IS 'Latest TestRun result: PASSED/FAILED/BLOCKED/SKIPPED/NOT_RUN';
COMMENT ON COLUMN task.test_cases.derived_status IS 'Server-computed display status from definition_status + last_outcome';

-- ============================================================
-- 3. Test Case Trace Links (Requirement / Story)
-- ============================================================
CREATE TABLE task.test_case_requirement_links (
    test_case_id        VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    requirement_id      VARCHAR(36) NOT NULL,
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by           VARCHAR(36),
    PRIMARY KEY (test_case_id, requirement_id)
);

CREATE INDEX idx_tcrl_req ON task.test_case_requirement_links(requirement_id);

CREATE TABLE task.test_case_story_links (
    test_case_id        VARCHAR(36) NOT NULL REFERENCES task.test_cases(id) ON DELETE CASCADE,
    story_id            VARCHAR(36) NOT NULL,
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by           VARCHAR(36),
    PRIMARY KEY (test_case_id, story_id)
);

CREATE INDEX idx_tcsl_story ON task.test_case_story_links(story_id);

-- ============================================================
-- 4. Test Steps (ordered steps within a test case)
-- ============================================================
CREATE TABLE task.test_steps (
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

CREATE INDEX idx_tstep_tc ON task.test_steps(test_case_id);

-- ============================================================
-- 5. Test Runs (immutable execution snapshots)
-- ============================================================
CREATE TABLE task.test_runs (
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

CREATE INDEX idx_tr_tc ON task.test_runs(test_case_id);
CREATE INDEX idx_tr_project ON task.test_runs(project_id);
CREATE INDEX idx_tr_result ON task.test_runs(result);
CREATE INDEX idx_tr_executor ON task.test_runs(executor_id);
CREATE INDEX idx_tr_tc_created ON task.test_runs(test_case_id, created_at DESC);

COMMENT ON TABLE task.test_runs IS 'Immutable test execution snapshots (who, when, result, environment)';
COMMENT ON COLUMN task.test_runs.run_number IS 'Sequential per test_case_id, allocated via DB-level serialization';
COMMENT ON COLUMN task.test_runs.mode IS 'DETAILED = step-by-step, QUICK = bulk record (v2.0)';

-- ============================================================
-- 6. Test Run Step Results (per-step results within a run)
-- ============================================================
CREATE TABLE task.test_run_step_results (
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

CREATE INDEX idx_trsr_run ON task.test_run_step_results(test_run_id);
```

---

## 3. Java Package Structure

```
com.insuretech.pms.test
  +-- controller/
  |   +-- ReactiveTestSuiteController.java
  |   +-- ReactiveTestCaseController.java
  |   +-- ReactiveTestRunController.java
  |   +-- ReactiveTestCoverageController.java
  +-- service/
  |   +-- ReactiveTestSuiteService.java
  |   +-- ReactiveTestCaseService.java
  |   +-- ReactiveTestRunService.java
  |   +-- ReactiveTestCoverageService.java
  +-- reactive/
  |   +-- entity/
  |   |   +-- R2dbcTestSuite.java
  |   |   +-- R2dbcTestCase.java
  |   |   +-- R2dbcTestStep.java
  |   |   +-- R2dbcTestRun.java
  |   |   +-- R2dbcTestRunStepResult.java
  |   |   +-- R2dbcTestCaseRequirementLink.java
  |   |   +-- R2dbcTestCaseStoryLink.java
  |   +-- repository/
  |       +-- ReactiveTestSuiteRepository.java
  |       +-- ReactiveTestCaseRepository.java
  |       +-- ReactiveTestStepRepository.java
  |       +-- ReactiveTestRunRepository.java
  |       +-- ReactiveTestRunStepResultRepository.java
  |       +-- ReactiveTestCaseRequirementLinkRepository.java
  |       +-- ReactiveTestCaseStoryLinkRepository.java
  +-- dto/
      +-- TestSuiteDto.java
      +-- TestSuiteSummaryDto.java
      +-- TestCaseDto.java
      +-- TestCaseCreateRequest.java
      +-- TestCaseUpdateRequest.java
      +-- TestStepDto.java
      +-- TestRunDto.java
      +-- TestRunCreateRequest.java
      +-- QuickRunRequest.java
      +-- TestCoverageDto.java
      +-- TestKpiDto.java
      +-- TestCaseFilterRequest.java
```

---

## 4. Entity Examples

### R2dbcTestCase.java

```java
@Table(name = "test_cases", schema = "task")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class R2dbcTestCase extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("suite_id")
    private String suiteId;

    @Column("test_case_code")
    private String testCaseCode;

    @Column("title")
    private String title;

    @Nullable @Column("description")
    private String description;

    @Nullable @Column("preconditions")
    private String preconditions;

    @Column("test_type")
    @Builder.Default
    private String testType = "MANUAL";

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Column("definition_status")
    @Builder.Default
    private String definitionStatus = "DRAFT";

    @Column("last_outcome")
    @Builder.Default
    private String lastOutcome = "NOT_RUN";

    // derived_status is GENERATED ALWAYS -- read-only
    @Column("derived_status")
    private String derivedStatus;

    @Nullable @Column("assignee_id")
    private String assigneeId;

    @Nullable @Column("phase_id")
    private String phaseId;

    @Column("run_count")
    @Builder.Default
    private Integer runCount = 0;

    @Nullable @Column("last_run_at")
    private LocalDateTime lastRunAt;

    @Nullable @Column("estimated_duration")
    private Integer estimatedDuration;
}
```

### R2dbcTestRun.java

```java
@Table(name = "test_runs", schema = "task")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class R2dbcTestRun extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("test_case_id")
    private String testCaseId;

    @Column("project_id")
    private String projectId;

    @Column("run_number")
    private Integer runNumber;

    @Column("mode")
    @Builder.Default
    private String mode = "DETAILED";

    @Column("result")
    private String result;

    @Column("executor_id")
    private String executorId;

    @Nullable @Column("environment")
    private String environment;

    @Column("started_at")
    private LocalDateTime startedAt;

    @Nullable @Column("finished_at")
    private LocalDateTime finishedAt;

    @Nullable @Column("duration_seconds")
    private Integer durationSeconds;

    @Nullable @Column("notes")
    private String notes;

    @Nullable @Column("defect_issue_id")
    private String defectIssueId;

    @Nullable @Column("defect_create_status")
    private String defectCreateStatus;
}
```

---

## 5. API Endpoint List

All endpoints are scoped under `/api/v2/projects/{projectId}/tests`.

### 5.1 Test Suites

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/suites` | List test suites for project | `view_tests` |
| `GET` | `/suites/{suiteId}` | Get suite detail with stats | `view_tests` |
| `POST` | `/suites` | Create test suite | `manage_tests` |
| `PUT` | `/suites/{suiteId}` | Update test suite | `manage_tests` |
| `DELETE` | `/suites/{suiteId}` | Archive (soft-delete) suite | `manage_tests` |

### 5.2 Test Cases

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/cases` | List test cases (FilterSpec: suiteId, definitionStatus, lastOutcome, priority, assigneeId, requirementId, storyId, phaseId, view, dateRange, q) | `view_tests` |
| `GET` | `/cases/{testCaseId}` | Get test case detail with steps + linked items | `view_tests` |
| `POST` | `/cases` | Create test case with steps | `manage_tests` |
| `PUT` | `/cases/{testCaseId}` | Update test case metadata + steps | `manage_tests` |
| `DELETE` | `/cases/{testCaseId}` | Delete test case | `manage_tests` |
| `PATCH` | `/cases/{testCaseId}/status` | Change definitionStatus (DRAFT->READY->DEPRECATED) | `manage_tests` |
| `POST` | `/cases/{testCaseId}/links/requirements` | Link to requirement(s) | `manage_tests` |
| `POST` | `/cases/{testCaseId}/links/stories` | Link to story(ies) | `manage_tests` |
| `DELETE` | `/cases/{testCaseId}/links/requirements/{requirementId}` | Unlink requirement | `manage_tests` |
| `DELETE` | `/cases/{testCaseId}/links/stories/{storyId}` | Unlink story | `manage_tests` |

### 5.3 Test Runs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/cases/{testCaseId}/runs` | List runs for a test case (timeline) | `view_tests` |
| `GET` | `/cases/{testCaseId}/runs/{runId}` | Get run detail with step results | `view_tests` |
| `POST` | `/cases/{testCaseId}/runs` | Record a test run (DETAILED mode) | `manage_tests` |
| `POST` | `/runs/quick` | Record bulk QuickRun results | `manage_tests` |
| `PATCH` | `/cases/{testCaseId}/runs/{runId}/defect` | Link/retry defect issue creation | `manage_tests` |

### 5.4 Coverage & KPI

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/kpi` | Test KPI summary (total, pass_rate, fail_count, blocked_count, coverage_rate, execution_rate, regression_pass_rate) | `view_tests` |
| `GET` | `/coverage` | Coverage analysis (linkCoverage + passCoverage per Req/Story) | `view_tests` |
| `GET` | `/coverage/gaps` | Requirements/Stories with no linked TCs | `view_tests` |

---

## 6. LLM Workflow

**Not applicable** -- Test Management has no direct AI/LLM integration in the design spec. The existing AI chatbot can answer test-related questions via the standard DB query path.

---

## 7. Implementation Steps (Ordered)

### Phase 1: Database & Entities (2 days)
1. Create Flyway migration `V20260236_01__test_management_tables.sql`
2. Implement R2DBC entities: `R2dbcTestSuite`, `R2dbcTestCase`, `R2dbcTestStep`, `R2dbcTestRun`, `R2dbcTestRunStepResult`, `R2dbcTestCaseRequirementLink`, `R2dbcTestCaseStoryLink`
3. Implement reactive repositories extending `ReactiveCrudRepository`
4. Add custom query methods (`findByProjectId`, `findBySuiteId`, `findByTestCaseIdOrderByRunNumberDesc`)

### Phase 2: DTOs & Service Layer (2 days)
5. Define DTO records: `TestSuiteDto`, `TestCaseDto`, `TestRunDto`, `TestStepDto`, `TestCoverageDto`, `TestKpiDto`
6. Define request records: `TestCaseCreateRequest`, `TestCaseUpdateRequest`, `TestRunCreateRequest`, `QuickRunRequest`
7. Implement `ReactiveTestSuiteService` (CRUD + stats aggregation)
8. Implement `ReactiveTestCaseService` (CRUD + 2-axis status management + trace links)
9. Implement `ReactiveTestRunService` (run recording + DB-level run_number serialization + last_outcome sync)
10. Implement `ReactiveTestCoverageService` (linkCoverage + passCoverage calculation)

### Phase 3: Controllers (1 day)
11. Implement `ReactiveTestSuiteController` with `@RequestMapping("/api/v2/projects/{projectId}/tests/suites")`
12. Implement `ReactiveTestCaseController` with `@RequestMapping("/api/v2/projects/{projectId}/tests/cases")`
13. Implement `ReactiveTestRunController` with endpoints for runs + quick runs
14. Implement `ReactiveTestCoverageController` with KPI + coverage endpoints
15. Add `@PreAuthorize` annotations following the capability model (`view_tests`, `manage_tests`)
16. Add ScopeEcho (`scope: { projectId }`) to all API responses

### Phase 4: Business Logic (2 days)
17. Implement run_number serialization (use `SELECT MAX(run_number) + 1 FROM test_runs WHERE test_case_id = ? FOR UPDATE` or equivalent R2DBC approach)
18. Implement last_outcome sync: after each TestRun insert, update `test_cases.last_outcome` and `run_count`
19. Implement defect linking (create Issue from failed run, idempotent with `defect_create_status`)
20. Implement FilterSpec query builder for test case listing (support all 12 filter keys)
21. Implement pagination with `page`/`size` parameters

### Phase 5: Testing & Documentation (2 days)
22. Write unit tests for service layer (test suite CRUD, test case status transitions, run number serialization, coverage calculation)
23. Write integration tests for controller endpoints
24. Add OpenAPI annotations (`@Operation`, `@Tag`, `@Schema`)
25. Verify ScopeEcho in all responses
26. Test concurrent run_number allocation under load

---

## 8. Verification Steps

- [ ] All 6 tables created in `task` schema with correct indexes and constraints
- [ ] R2DBC entities correctly map to tables (schema annotation, column names)
- [ ] Test suite CRUD endpoints return `Mono<ResponseEntity<ApiResponse<T>>>`
- [ ] Test case filtering works with all 12 FilterSpec keys
- [ ] 2-axis status model: `definitionStatus` and `lastOutcome` independently tracked
- [ ] `derivedStatus` column is generated correctly (STORED generated column)
- [ ] `run_number` allocation is safe under concurrent execution
- [ ] `last_outcome` on TestCase updates after each TestRun insertion
- [ ] Coverage calculation: `linkCoverage` (any TC linked) vs `passCoverage` (all TCs PASSED) both correct
- [ ] QuickRun mode creates test runs without step-by-step results
- [ ] Defect creation is idempotent (`defect_create_status` prevents duplicates)
- [ ] `@PreAuthorize` correctly enforces `view_tests` for reads and `manage_tests` for writes
- [ ] ScopeEcho `scope: { projectId }` present in all API responses
- [ ] Violations array returned for invalid status transitions (HTTP 422)
- [ ] Pagination works correctly with default 20 items per page
