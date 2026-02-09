# Implementation Plan: PMO Governance Dashboard Backend

> **Plan Version**: 1.0
> **Date**: 2026-02-10
> **Design Spec Reference**: `docs/10_menu/화면설계/15_PMO거버넌스_화면설계.md` (v2.1)
> **Status**: NOT STARTED

---

## 1. Gap Summary

The PMO Governance screen has two routes (`/pmo` for portfolio hub, `/pmo/health` for Health Matrix detail) with a comprehensive v2.1 design spec. However, **no PMO dashboard controller, service, or aggregation logic exists**. The gap includes:

- No `ReactivePmoController` or `ReactivePmoService`
- No Health Score calculation logic (5-dimension: Schedule/Cost/Quality/Risk/Resource)
- No cross-project aggregation endpoints
- No Health History snapshot table for trend analysis
- The existing `ReactiveDashboardController` handles single-project dashboards only

Unlike other plans, this implementation **does not require new core data tables** -- it aggregates data from existing `project`, `task`, `lineage`, and decision/risk tables (from Plan 12). However, it does require a **Health History snapshot table** for immutable trend data.

Key design principles:
- Portfolio-level view (multi-project)
- Health Score A-F grading with 5 dimensions
- Trend visualization over time (snapshot-based, immutable)
- Capability separation: `view_pmo` (hub) + `view_pmo_health` (Health Matrix)
- API metadata: `asOfStrategy`, `appliedFilter`, `appliedSort`, `calcVersion`

---

## 2. DB Schema Changes (Flyway Migration)

**File**: `V20260236_03__pmo_health_snapshot_tables.sql`
**Schema**: `project`

```sql
-- V20260236_03: PMO Health snapshot tables for trend analysis
-- Design spec: 15_PMO거버넌스_화면설계.md v2.1
-- Only new tables needed -- PMO aggregates from existing project/task/risk data

-- ============================================================
-- 1. Health Score Snapshots (immutable trend data)
-- ============================================================
CREATE TABLE project.health_score_snapshots (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    snapshot_date       DATE NOT NULL,
    calc_version        VARCHAR(20) NOT NULL DEFAULT 'v1.0',
        -- Tracks calculation algorithm version for audit
    overall_score       DECIMAL(5,2) NOT NULL,
    overall_grade       VARCHAR(2) NOT NULL,
        -- A, B, C, D, F
    schedule_score      DECIMAL(5,2),
    cost_score          DECIMAL(5,2),
    quality_score       DECIMAL(5,2),
    risk_score          DECIMAL(5,2),
    resource_score      DECIMAL(5,2),
    schedule_grade      VARCHAR(2),
    cost_grade          VARCHAR(2),
    quality_grade       VARCHAR(2),
    risk_grade          VARCHAR(2),
    resource_grade      VARCHAR(2),
    alert_level         VARCHAR(10) NOT NULL DEFAULT 'GREEN',
        -- RED, YELLOW, GREEN
    data_completeness   JSONB,
        -- { "schedule": true, "cost": true, "quality": false, ... }
    grade_cap_reason    VARCHAR(100),
        -- v2.1: If critical dimension missing, grade is capped
    raw_metrics_json    JSONB,
        -- Immutable snapshot of all input metrics used for calculation
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_health_snapshot UNIQUE(project_id, snapshot_date, calc_version)
);

CREATE INDEX idx_hss_project_date ON project.health_score_snapshots(project_id, snapshot_date DESC);
CREATE INDEX idx_hss_alert ON project.health_score_snapshots(alert_level) WHERE alert_level IN ('RED', 'YELLOW');
CREATE INDEX idx_hss_date ON project.health_score_snapshots(snapshot_date DESC);

COMMENT ON TABLE project.health_score_snapshots IS 'Immutable health score snapshots for PMO trend analysis';
COMMENT ON COLUMN project.health_score_snapshots.calc_version IS 'Algorithm version -- when logic changes, old data stays for comparison';
COMMENT ON COLUMN project.health_score_snapshots.grade_cap_reason IS 'v2.1: Critical dimension missing -> grade capped (e.g., "missing schedule -> max B")';

-- ============================================================
-- 2. PMO Dashboard Configuration (per-user preferences)
-- ============================================================
CREATE TABLE project.pmo_dashboard_config (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             VARCHAR(36) NOT NULL,
    config_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
        -- { "sortBy": "overall", "sortDir": "desc", "trendPeriod": "3m", ... }
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_pmo_config_user UNIQUE(user_id)
);
```

---

## 3. Java Package Structure

```
com.insuretech.pms.pmo
  +-- controller/
  |   +-- ReactivePmoController.java          (/api/v2/pmo)
  |   +-- ReactivePmoHealthController.java    (/api/v2/pmo/health)
  +-- service/
  |   +-- ReactivePmoService.java             (portfolio aggregation)
  |   +-- ReactiveHealthScoreService.java     (5-dimension scoring)
  |   +-- ReactiveHealthSnapshotService.java  (snapshot creation/query)
  |   +-- HealthScoreCalculator.java          (pure calculation logic)
  +-- reactive/
  |   +-- entity/
  |   |   +-- R2dbcHealthScoreSnapshot.java
  |   |   +-- R2dbcPmoDashboardConfig.java
  |   +-- repository/
  |       +-- ReactiveHealthScoreSnapshotRepository.java
  |       +-- ReactivePmoDashboardConfigRepository.java
  +-- dto/
      +-- PortfolioSummaryDto.java
      +-- ProjectHealthRowDto.java
      +-- HealthScoreDto.java
      +-- HealthDimensionDto.java
      +-- HealthTrendDto.java
      +-- HealthMatrixDto.java
      +-- PmoKpiDto.java
      +-- CrossProjectResourceDto.java
      +-- MilestoneCalendarDto.java
      +-- PmoFilterRequest.java
      +-- HealthMatrixFilterRequest.java
```

---

## 4. API Endpoint List

### 4.1 PMO Dashboard (Hub)

Base path: `/api/v2/pmo`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/dashboard` | Portfolio summary (KPIs: portfolio_count, avg_health_score, critical_projects, on_track_projects, delayed_projects, at_risk_projects, total_resource_utilization) | `view_pmo` |
| `GET` | `/projects` | Project health table (list with health grades, sortable/filterable via PmoFilterSpec) | `view_pmo` |
| `GET` | `/projects/{projectId}/summary` | Single project summary for PMO context | `view_pmo` |
| `GET` | `/resources` | Cross-project resource allocation overview | `view_pmo` |
| `GET` | `/milestones` | Milestone calendar (upcoming milestones across projects) | `view_pmo` |
| `GET` | `/alerts` | Active alerts (RED/YELLOW projects with reasons) | `view_pmo` |

### 4.2 Health Matrix (Detail)

Base path: `/api/v2/pmo/health`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/matrix` | Health Matrix (all projects x 5 dimensions, sortable by dimension) | `view_pmo_health` |
| `GET` | `/matrix/{projectId}` | Single project health detail (radar chart data, 5 dimensions) | `view_pmo_health` |
| `GET` | `/trend` | Health trend over time (filterable by project, dimension, period) | `view_pmo_health` |
| `GET` | `/ranking` | Dimension ranking (projects ranked by specific dimension score) | `view_pmo_health` |
| `POST` | `/snapshot` | Trigger health snapshot calculation (admin/scheduler) | `manage_pmo` |
| `GET` | `/history` | Health history table (immutable snapshots, filterable) | `view_pmo_health` |

### 4.3 API Response Metadata (v2.1)

All PMO endpoints include metadata in the response:

```json
{
  "data": { ... },
  "meta": {
    "asOfStrategy": "LIVE",
    "asOf": "2026-02-10T09:30:00Z",
    "appliedFilter": { "healthGrade": "D", "projectStatus": "delayed" },
    "appliedSort": { "by": "overall", "dir": "desc" },
    "calcVersion": "v1.0",
    "projectCount": 12,
    "warnings": []
  },
  "scope": { "level": "portfolio" }
}
```

---

## 5. Health Score Calculation Logic

### 5.1 HealthScoreCalculator

```java
/**
 * Pure calculation logic -- no DB dependencies.
 * Testable in isolation with mock metrics.
 */
public class HealthScoreCalculator {

    private static final String CALC_VERSION = "v1.0";

    // Dimension weights (configurable)
    private static final Map<String, Double> WEIGHTS = Map.of(
        "schedule", 0.25,
        "cost",     0.25,
        "quality",  0.20,
        "risk",     0.15,
        "resource", 0.15
    );

    /**
     * Schedule dimension: based on SPI (Schedule Performance Index)
     * SPI = EV / PV -- 1.0 = on track, <1.0 = behind
     */
    public static double calculateScheduleScore(double spi, double onTimeTaskRate) {
        // SPI contributes 70%, on-time task rate 30%
        double spiScore = Math.min(spi * 100, 100);
        double taskScore = onTimeTaskRate * 100;
        return spiScore * 0.7 + taskScore * 0.3;
    }

    /**
     * Overall score = weighted average of available dimensions.
     * v2.1: Critical dimension (schedule/cost) missing -> grade capped at B.
     */
    public static HealthScoreResult calculate(Map<String, Double> dimensionScores) {
        // ... weighted average with missing-dimension handling
    }

    public static String scoreToGrade(double score) {
        if (score >= 90) return "A";
        if (score >= 75) return "B";
        if (score >= 60) return "C";
        if (score >= 40) return "D";
        return "F";
    }

    public static String gradeToAlertLevel(String grade) {
        return switch (grade) {
            case "A", "B" -> "GREEN";
            case "C" -> "YELLOW";
            default -> "RED";
        };
    }
}
```

### 5.2 Data Sources for Each Dimension

| Dimension | Source Tables | Key Metrics |
|-----------|-------------|-------------|
| **Schedule** | `project.wbs_tasks`, `project.phases` | SPI, on-time completion %, overdue task count |
| **Cost** | `project.projects` (budget fields) | CPI, budget burn rate, EAC vs BAC |
| **Quality** | `task.test_cases`, `task.test_runs` (Plan 10) | Pass rate, defect density, coverage rate |
| **Risk** | `project.risks` (Plan 12) | Active critical risks, avg risk score, mitigation rate |
| **Resource** | `project.project_members`, `task.tasks` | Utilization rate, over-allocation count |

---

## 6. LLM Workflow

**Not applicable** -- PMO Governance does not require direct LLM integration. The aggregation is purely data-driven. The existing AI chatbot can answer PMO-related questions via the standard query path.

---

## 7. Implementation Steps (Ordered)

### Phase 1: Database & Core (1 day)
1. Create Flyway migration `V20260236_03__pmo_health_snapshot_tables.sql`
2. Implement R2DBC entities: `R2dbcHealthScoreSnapshot`, `R2dbcPmoDashboardConfig`
3. Implement reactive repositories

### Phase 2: Health Score Engine (2 days)
4. Implement `HealthScoreCalculator` (pure calculation logic, unit-testable)
5. Implement dimension calculators: `ScheduleScoreCalculator`, `CostScoreCalculator`, `QualityScoreCalculator`, `RiskScoreCalculator`, `ResourceScoreCalculator`
6. Implement `ReactiveHealthScoreService` (orchestrates dimension calculators, handles missing dimensions, grade capping)
7. Implement `ReactiveHealthSnapshotService` (creates immutable snapshots, supports scheduled and on-demand triggers)

### Phase 3: PMO Aggregation Service (2 days)
8. Implement `ReactivePmoService` with cross-project data aggregation:
   - Portfolio KPIs (count, averages, alerts)
   - Project health table with sorting/filtering
   - Cross-project resource allocation
   - Milestone calendar (upcoming milestones across projects)
9. Implement FilterSpec query builder for PMO (PmoFilterSpec: projectId[], healthGrade, dateRange, projectStatus, q)
10. Implement HealthMatrixFilterSpec query builder (trendPeriod, alertLevel, sortBy, sortDir, dimension)

### Phase 4: Controllers (1 day)
11. Implement `ReactivePmoController` at `/api/v2/pmo`
12. Implement `ReactivePmoHealthController` at `/api/v2/pmo/health`
13. Add API response metadata (`asOfStrategy`, `appliedFilter`, `appliedSort`, `calcVersion`)
14. Add `@PreAuthorize` for `view_pmo` and `view_pmo_health` capabilities
15. Add ScopeEcho (`scope: { level: "portfolio" }`)

### Phase 5: Scheduler & Snapshots (1 day)
16. Implement scheduled snapshot creation (daily at midnight or configurable)
17. Implement on-demand snapshot trigger endpoint (admin only)
18. Ensure snapshot immutability (no update/delete on health_score_snapshots)

### Phase 6: Testing & Documentation (2 days)
19. Unit tests for `HealthScoreCalculator` (all dimension calculations, grade boundaries, missing dimension handling, grade capping)
20. Unit tests for cross-project aggregation (empty projects, mixed health grades)
21. Integration tests for PMO endpoints
22. Integration tests for Health Matrix endpoints
23. Add OpenAPI annotations
24. Verify INVALID_FILTER_DROPPED warning mechanism

---

## 8. Verification Steps

- [ ] Health snapshot table created with immutability constraint (no UPDATE endpoint)
- [ ] `calc_version` tracked in every snapshot for algorithm change tracing
- [ ] 5 dimensions correctly calculated from source data (schedule, cost, quality, risk, resource)
- [ ] Grade assignment boundaries: A(>=90), B(>=75), C(>=60), D(>=40), F(<40)
- [ ] Alert levels: GREEN(A,B), YELLOW(C), RED(D,F)
- [ ] v2.1 grade capping: missing schedule/cost dimension caps grade at B max
- [ ] Cross-project aggregation returns data only for projects user has access to
- [ ] FilterSpec supports `projectId[]` (always array, even for 0 or 1 element)
- [ ] Health trend endpoint returns time-series data for selected period (1m, 3m, 6m, 1y)
- [ ] Health Matrix endpoint returns all projects x 5 dimensions sortable by any dimension
- [ ] API response metadata includes `asOfStrategy`, `appliedFilter`, `appliedSort`, `calcVersion`
- [ ] INVALID_FILTER_DROPPED warning returned when invalid enum values are silently dropped
- [ ] `@PreAuthorize` correctly enforces `view_pmo` for hub endpoints and `view_pmo_health` for Health Matrix
- [ ] Snapshot scheduler runs daily and creates immutable records
- [ ] Drill-down from PMO project row to individual project dashboard works via `projectId` context
- [ ] Empty portfolio (no projects) returns valid empty response, not 404
