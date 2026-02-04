# Dashboard Data Reliability Implementation Plan v2.1

> **Goal**: Transform the dashboard from a system that mixes real DB data with fabricated mock data into a fully DB-backed, contractually trustworthy statistics system.
>
> **Core Principle**: Reliability is not achieved by "connecting to DB" — it is achieved by proving it through contracts (`asOf` / `scope` / `completeness` / `warnings`).

---

## Current State Assessment

| Dashboard Section | Data Source | Trustworthy? |
|---|---|---|
| KPI: Progress / Issues / Tasks | DB via API | Yes |
| KPI: Budget Execution Rate | Hardcoded `0` | **No** |
| AI/SI/Common Track Progress | DB via API (name-pattern matching) | **Fragile** |
| Sub-project Status Table | `subProjectData` mock | **No** |
| Part Leader Status | `partLeaderData` mock | **No** |
| Phase Progress Chart | `phaseData` mock | **No** |
| Sprint Velocity Chart | `sprintVelocity` mock | **No** |
| Burndown Chart | `burndownData` mock | **No** |
| AI Insights | Hardcoded Korean text | **No** |
| Portfolio Summary Cards | Client-side calculation | **Inconsistent** |
| Recent Activities | DB via API | Yes |

**Conclusion**: ~60% of visible dashboard data has no connection to the database.

---

## Foundational Design: Dashboard Data Contract

Before implementing any endpoint, establish a **system-wide data contract** that every dashboard API response must follow. This is not optional — it is the mechanism that prevents the dashboard from ever silently lying again.

### Common Response Envelope

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardSection<T> {
    private T data;
    private DashboardMeta meta;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DashboardMeta {
        private LocalDateTime asOf;               // Server timestamp when data was computed
        private String scope;                     // "portfolio", "project:proj-001", "sprint:sprint-003"
        private List<String> sources;             // ["project.phases", "project.wbs_tasks"]
        private List<String> queryIds;            // ["DASH_PHASE_PROGRESS_V1"] — traceable query identifiers
        private Completeness completeness;        // COMPLETE, PARTIAL, NO_DATA
        private List<DashboardWarning> warnings;  // Structured warnings with code + message
        private Long computeMs;                   // Server-side computation time in milliseconds
        private Boolean usedFallback;             // true if fallback/secondary source was used
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DashboardWarning {
        private String code;      // Machine-readable: "WEEKLY_REPORTS_EMPTY", "BURNDOWN_APPROXIMATE"
        private String message;   // Human-readable: "weekly_reports empty, fell back to user_stories"
    }

    public enum Completeness {
        COMPLETE,     // All expected data present
        PARTIAL,      // Some data missing, result may be approximate
        NO_DATA       // No data available, section should display N/A
    }
}
```

### Completeness Determination Rules

`completeness` must be determined **semantically per section**, not mechanically via `data != null`. Each section defines its own completeness criteria:

| Section | COMPLETE | PARTIAL | NO_DATA |
|---|---|---|---|
| Phase Progress | `phases` list is non-empty | — | No phases exist for project |
| Sprint Velocity | All sprints have `plannedPoints` + `velocity` | `velocity == null` (no weekly_reports) | No sprints exist |
| Burndown | Status history table exists | `isApproximate == true` (using `updated_at` proxy) | No sprint or no stories |
| Part Stats | All parts have task counts | — | No parts exist |
| AI Insights | All insight queries returned results | Some queries returned empty | No data matched any insight pattern |
| Budget | `budgetSpent` available | — | Only `budgetTotal` known (no spending table) |

> **Anti-pattern**: `completeness = (data != null) ? COMPLETE : NO_DATA` — this is **wrong**. An empty list `[]` is valid data (NO_DATA), and an approximate burndown is not COMPLETE even though `data != null`.

### Contract Rules

| Rule | Description |
|---|---|
| `asOf` is mandatory | Every response includes the server-side computation timestamp |
| `0` is never a substitute for `null` | If data does not exist, return `null` with `completeness=NO_DATA` |
| Fallback must be declared | If a query falls back to secondary source, `warnings` explains why and `usedFallback=true` |
| `sources` traces to tables | Every metric declares which table(s) produced it as a list (e.g., `["project.phases", "project.wbs_tasks"]`) |
| `queryIds` enables tracing | Each section has a versioned query identifier (e.g., `"DASH_PHASE_PROGRESS_V1"`) for log correlation |
| `computeMs` enables monitoring | Server-side computation time is always included for performance observability |
| Warnings are structured | Every warning has a machine-readable `code` and human-readable `message` |
| Status derivation is server-side | `normal/warning/danger` is computed by the backend with `StatusReasonCode` enum, never by the frontend |

### Status Derivation Rules (Server-Side Only)

Status classification must live in the backend to prevent client-side logic divergence. Reason codes are a **closed enum**, not free-form strings — this prevents typo-driven bugs and enables frontend i18n mapping.

#### StatusReasonCode Enum

```java
public enum StatusReasonCode {
    // Part-level reasons
    BLOCKED_RATIO_OVER_20_PCT,       // blocked / total > 0.20
    BLOCKED_RATIO_OVER_10_PCT,       // blocked / total > 0.10
    THREE_OR_MORE_BLOCKED_TASKS,     // blocked >= 3
    ONE_OR_MORE_BLOCKED_TASKS,       // blocked >= 1

    // Phase-level reasons
    OVERDUE_NOT_COMPLETED,           // endDate < today && progress < 100
    PROGRESS_BELOW_30_PCT,           // progress < 30
    PHASE_COMPLETED,                 // status == COMPLETED

    // Sprint-level reasons
    VELOCITY_DECLINING,              // current velocity < previous sprint
    COMPLETION_RATE_BELOW_50_PCT,    // completedPoints / plannedPoints < 0.50

    // General
    NO_TASKS_ASSIGNED,               // total == 0
}
```

#### Derivation Logic

```java
public class StatusDerivation {
    public static StatusResult derivePartStatus(long blocked, long total, long inProgress) {
        List<StatusReasonCode> reasons = new ArrayList<>();
        if (total == 0) {
            reasons.add(StatusReasonCode.NO_TASKS_ASSIGNED);
            return new StatusResult("normal", reasons);
        }
        double blockedRatio = (double) blocked / total;
        if (blocked >= 3) reasons.add(StatusReasonCode.THREE_OR_MORE_BLOCKED_TASKS);
        if (blockedRatio > 0.20) reasons.add(StatusReasonCode.BLOCKED_RATIO_OVER_20_PCT);
        if (blocked >= 1) reasons.add(StatusReasonCode.ONE_OR_MORE_BLOCKED_TASKS);
        if (blockedRatio > 0.10) reasons.add(StatusReasonCode.BLOCKED_RATIO_OVER_10_PCT);

        String status = !reasons.isEmpty() && reasons.stream().anyMatch(r ->
            r == StatusReasonCode.THREE_OR_MORE_BLOCKED_TASKS ||
            r == StatusReasonCode.BLOCKED_RATIO_OVER_20_PCT) ? "danger"
            : !reasons.isEmpty() ? "warning" : "normal";
        return new StatusResult(status, reasons);
    }

    public static StatusResult derivePhaseStatus(int progress, LocalDate endDate, String phaseStatus) {
        List<StatusReasonCode> reasons = new ArrayList<>();
        if ("COMPLETED".equals(phaseStatus)) {
            reasons.add(StatusReasonCode.PHASE_COMPLETED);
            return new StatusResult("normal", reasons);
        }
        if (endDate != null && endDate.isBefore(LocalDate.now()) && progress < 100) {
            reasons.add(StatusReasonCode.OVERDUE_NOT_COMPLETED);
        }
        if (progress < 30) {
            reasons.add(StatusReasonCode.PROGRESS_BELOW_30_PCT);
        }
        String status = reasons.contains(StatusReasonCode.OVERDUE_NOT_COMPLETED) ? "danger"
            : reasons.contains(StatusReasonCode.PROGRESS_BELOW_30_PCT) ? "warning" : "normal";
        return new StatusResult(status, reasons);
    }

    @Data @AllArgsConstructor
    public static class StatusResult {
        private String status;                    // "normal", "warning", "danger"
        private List<StatusReasonCode> reasons;   // Enum values, not strings
    }
}
```

Each response includes typed `statusReasonCodes` so operators can understand why a status was assigned:
```java
private String status;                          // "danger"
private List<StatusReasonCode> statusReasons;   // [BLOCKED_RATIO_OVER_20_PCT, THREE_OR_MORE_BLOCKED_TASKS]
```

> **Frontend i18n**: The frontend maps each `StatusReasonCode` to a localized display string. No raw strings from the backend are shown to users.

---

## Frontend Contract: StatValue Component

All numeric rendering on the dashboard must go through a single common component. This eliminates per-section null handling and makes the "0 vs N/A" policy systematic.

```typescript
// StatValue.tsx
interface StatValueProps {
    value: number | null | undefined;
    completeness?: 'COMPLETE' | 'PARTIAL' | 'NO_DATA';
    format?: 'number' | 'percent' | 'currency';
    suffix?: string;
    zeroLabel?: string;         // What to show when value is genuinely 0
    unavailableLabel?: string;  // Default: "N/A"
    unavailableTooltip?: string;
}
```

**Rendering rules**:
| Condition | Display | Style |
|---|---|---|
| `value === null` or `completeness === 'NO_DATA'` | `unavailableLabel` (default "N/A") | Gray, with tooltip explaining why |
| `value === 0` and `zeroLabel` provided | `zeroLabel` | Normal |
| `value === 0` and no `zeroLabel` | `"0"` | Normal (genuine zero) |
| `completeness === 'PARTIAL'` | Value with gray dot indicator | Tooltip: "Partial data" |
| `completeness === 'COMPLETE'` | Value | Normal |

---

## Frontend Contract: Data Source Badge

Replace the simple "Sample Data" badge with a 3-tier classification system:

| Badge | Meaning | Style | Used When |
|---|---|---|---|
| `NOT_CONNECTED` | DB not linked to this section | Red outline, muted content | Mock data sections before migration |
| `SAMPLE` | Representative sample, not live | Yellow outline | Demo/preview data |
| `CONCEPT` | Experimental feature, not data-driven | Purple outline | AI Insights before real implementation |

```typescript
// DataSourceBadge.tsx
interface DataSourceBadgeProps {
    type: 'NOT_CONNECTED' | 'SAMPLE' | 'CONCEPT';
    message?: string; // e.g., "DB 미연결 - Phase 4에서 연동 예정"
}
```

---

## Phase 0: Stop the Lies (Immediate)

**Objective**: Remove all false signals. No new features; only honesty.

### 0-1. Budget KPI: Display Honest Context Instead of 0%

The `budgetSpent` field is hardcoded to `BigDecimal.ZERO` in `ReactiveDashboardService.getBudgetStats()`. There is no `budget_spent` column, no expenditure table, and no cost tracking anywhere in the schema.

**Backend** — [ReactiveDashboardService.java:377-407](PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/project/reactive/service/ReactiveDashboardService.java#L377-L407)

- Change `getBudgetStats()` to return `spent = null` and `executionRate = null`
- Set `completeness = NO_DATA` for spending metrics
- Add warning: `"Budget expenditure tracking not implemented. Only allocated budget (project.projects.budget) is available."`

**DTO** — [DashboardStats.java:38-40](PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/report/dto/DashboardStats.java#L38-L40)

- `budgetSpent`: change to `@Nullable`, return `null`
- `budgetExecutionRate`: change to `@Nullable`, return `null`
- Keep `budgetTotal` (this value is real from `project.projects.budget`)

**Frontend** — [Dashboard.tsx:347-371](PMS_IC_FrontEnd_v1.2/src/app/components/Dashboard.tsx#L347-L371)

- Replace budget execution rate KPI card with info-area display:
  - Show: `"예산 총액(참고): ₩{budgetTotal}억"`
  - Below: `"집행 데이터 미연동 — 지출 테이블 도입 시 자동 집계"`
- Do NOT display as a KPI card with large number — this prevents users from treating non-actionable data as a KPI

### 0-2. Mark Mock Sections with Appropriate Badge

| Section | Mock Variable | Badge Type | Message |
|---|---|---|---|
| Sub-project Status | `subProjectData` | `NOT_CONNECTED` | DB 미연결 |
| Part Leader Status | `partLeaderData` | `NOT_CONNECTED` | DB 미연결 |
| Phase Progress | `phaseData` | `NOT_CONNECTED` | DB 미연결 |
| Sprint Velocity | `sprintVelocity` | `NOT_CONNECTED` | DB 미연결 |
| Burndown | `burndownData` | `NOT_CONNECTED` | DB 미연결 |
| AI Insights | Hardcoded text | `CONCEPT` | 컨셉 프리뷰 — 실제 데이터 기반 아님 |

### 0-3. Portfolio View: Use Dashboard Stats API

**Current** — [Dashboard.tsx:25-28](PMS_IC_FrontEnd_v1.2/src/app/components/Dashboard.tsx#L25-L28):
```tsx
const totalProjects = projects.length;
const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;
```

**Change**: Use `usePortfolioDashboardStats()` hook. The backend already has the endpoint (`GET /api/v2/dashboard/stats`) with proper SQL aggregation. Remove all client-side `.filter()` / `.reduce()` calculations.

---

## Phase 1: Track Classification Fix (Before Any New Endpoints)

**Objective**: Fix the data model foundation. Every subsequent endpoint depends on correct track classification.

> This is moved ahead of new endpoint creation because all statistics that break down by track (weighted progress, phase progress, WBS group stats) will be wrong if track classification is wrong.

### 1-1. Backfill `track_type` Where NULL

```sql
-- One-time migration: V20260205__backfill_track_type.sql

-- Step 1: Backfill using current name-pattern logic
UPDATE project.phases SET track_type = 'AI'
WHERE track_type IS NULL
  AND (name LIKE '%AI%' OR name LIKE '%모델%' OR name LIKE '%OCR%');

UPDATE project.phases SET track_type = 'SI'
WHERE track_type IS NULL
  AND (name LIKE '%SI%' OR name LIKE '%연동%' OR name LIKE '%레거시%'
       OR name LIKE '%마이그레이션%');

UPDATE project.phases SET track_type = 'COMMON'
WHERE track_type IS NULL;

-- Step 2: Add NOT NULL constraint to prevent future nulls
ALTER TABLE project.phases ALTER COLUMN track_type SET NOT NULL;
ALTER TABLE project.phases ALTER COLUMN track_type SET DEFAULT 'COMMON';
```

### 1-2. Replace Name Pattern Matching in Weighted Progress Query

**Current** — [ReactiveDashboardService.java:121-124](PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/project/reactive/service/ReactiveDashboardService.java#L121-L124):
```sql
CASE
    WHEN p.name LIKE '%AI%' OR wg.name LIKE '%AI%' ... THEN 'AI'
    ...
END as track
```

**Replace with**:
```sql
WITH track_stats AS (
    SELECT
        ph.track_type as track,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN wt.status = 'COMPLETED' THEN 1 END) as completed_tasks,
        AVG(COALESCE(wt.progress, 0)) as avg_progress
    FROM project.wbs_tasks wt
    JOIN project.wbs_groups wg ON wt.group_id = wg.id
    JOIN project.phases ph ON wt.phase_id = ph.id
    WHERE ph.project_id = :projectId
    GROUP BY ph.track_type
),
project_weights AS (
    SELECT ai_weight, si_weight, (1 - ai_weight - si_weight) as common_weight
    FROM project.projects WHERE id = :projectId
)
SELECT ts.track, ts.total_tasks, ts.completed_tasks, ts.avg_progress,
       pw.ai_weight, pw.si_weight, pw.common_weight
FROM track_stats ts
CROSS JOIN project_weights pw
```

### 1-3. Operational Validation

Add a scheduled check (daily or on-deploy) to alert if data integrity degrades:

```sql
-- Validation query: should return 0 rows after migration
SELECT id, name, track_type FROM project.phases WHERE track_type IS NULL;
```

If this ever returns rows, it means the NOT NULL constraint was bypassed or removed — trigger an operational alert.

---

## Phase 2: New Dashboard Endpoints + Aggregation

**Objective**: Create all section-specific endpoints plus one aggregation endpoint. All responses follow the `DashboardSection<T>` contract.

### 2-0. Aggregation Endpoint (Single Load)

**Endpoint**: `GET /api/v2/projects/{projectId}/dashboard`

This endpoint loads all dashboard sections in a single request. Internally it calls each section method in parallel using `Mono.zip()`.

```java
@Data @Builder
public class ProjectDashboardDto {
    private DashboardSection<DashboardStats> stats;
    private DashboardSection<PhaseProgressDto> phaseProgress;
    private DashboardSection<SprintVelocityDto> sprintVelocity;
    private DashboardSection<BurndownDto> burndown;
    private DashboardSection<PartStatsDto> partStats;
    private DashboardSection<WbsGroupStatsDto> wbsGroupStats;
    private DashboardSection<List<InsightDto>> insights;
}
```

**Benefits**:
- Single network round-trip for initial page load
- All sections share the same `asOf` timestamp — numbers are guaranteed consistent
- Fallback/error handling is unified
- Individual section endpoints remain available for refresh/testing

**Controller**:
```java
@GetMapping("/projects/{projectId}/dashboard")
public Mono<ResponseEntity<ApiResponse<ProjectDashboardDto>>> getFullDashboard(
        @PathVariable String projectId) {
    return dashboardService.getFullDashboard(projectId)
            .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
}
```

**Service** (parallel assembly with per-section error isolation):

Each section is wrapped with `onErrorResume` so that a failure in one section (e.g., sprint velocity SQL timeout) does not cascade to the entire dashboard. Failed sections return `completeness=NO_DATA` with a warning, not a 500 error.

```java
public Mono<ProjectDashboardDto> getFullDashboard(String projectId) {
    LocalDateTime asOf = LocalDateTime.now();
    String scope = "project:" + projectId;

    return Mono.zip(
        safeSection("stats", () -> getProjectStats(projectId)),
        safeSection("phaseProgress", () -> getPhaseProgress(projectId)),
        safeSection("sprintVelocity", () -> getSprintVelocity(projectId)),
        safeSection("burndown", () -> getActiveBurndown(projectId)),
        safeSection("partStats", () -> getPartStats(projectId)),
        safeSection("wbsGroupStats", () -> getWbsGroupStats(projectId)),
        safeSection("insights", () -> getInsights(projectId))
    ).map(tuple -> ProjectDashboardDto.builder()
        .stats(tuple.getT1())
        .phaseProgress(tuple.getT2())
        .sprintVelocity(tuple.getT3())
        .burndown(tuple.getT4())
        .partStats(tuple.getT5())
        .wbsGroupStats(tuple.getT6())
        .insights(tuple.getT7())
        .build());
}

/**
 * Wraps each section query with error isolation.
 * On failure: returns DashboardSection with data=null, completeness=NO_DATA,
 * and a warning containing the error details.
 */
private <T> Mono<DashboardSection<T>> safeSection(String sectionName,
        Supplier<Mono<DashboardSection<T>>> sectionSupplier) {
    long start = System.currentTimeMillis();
    return sectionSupplier.get()
        .doOnNext(section -> section.getMeta().setComputeMs(
            System.currentTimeMillis() - start))
        .onErrorResume(ex -> {
            log.error("Dashboard section '{}' failed: {}", sectionName, ex.getMessage());
            return Mono.just(DashboardSection.<T>builder()
                .data(null)
                .meta(DashboardMeta.builder()
                    .asOf(LocalDateTime.now())
                    .completeness(Completeness.NO_DATA)
                    .computeMs(System.currentTimeMillis() - start)
                    .usedFallback(false)
                    .warnings(List.of(new DashboardWarning(
                        "SECTION_QUERY_FAILED",
                        sectionName + " query failed: " + ex.getMessage())))
                    .build())
                .build());
        });
}
```

### Section-Specific `wrapSection` (Semantic Completeness)

Each section method is responsible for determining its own completeness semantically. The generic `wrapSection` helper provides defaults, but sections override as needed:

```java
/**
 * Generic wrapper — used as a starting point.
 * Sections with PARTIAL logic (burndown, velocity) override completeness after wrapping.
 */
private <T> DashboardSection<T> wrapSection(T data, LocalDateTime asOf,
        String scope, List<String> sources, List<String> queryIds,
        Completeness completeness, List<DashboardWarning> warnings) {
    return DashboardSection.<T>builder()
        .data(data)
        .meta(DashboardMeta.builder()
            .asOf(asOf)
            .scope(scope)
            .sources(sources)
            .queryIds(queryIds)
            .completeness(completeness)
            .warnings(warnings != null ? warnings : new ArrayList<>())
            .usedFallback(false)
            .build())
        .build();
}

// Example: Phase Progress — semantic completeness
private Mono<DashboardSection<PhaseProgressDto>> getPhaseProgress(String projectId) {
    return fetchPhaseMetrics(projectId).map(phases -> {
        Completeness c = phases.isEmpty()
            ? Completeness.NO_DATA
            : Completeness.COMPLETE;
        return wrapSection(
            new PhaseProgressDto(phases),
            LocalDateTime.now(),
            "project:" + projectId,
            List.of("project.phases", "project.wbs_tasks"),
            List.of("DASH_PHASE_PROGRESS_V1"),
            c, new ArrayList<>());
    });
}

// Example: Burndown — always PARTIAL until status history table exists
private Mono<DashboardSection<BurndownDto>> getActiveBurndown(String projectId) {
    return fetchBurndownData(projectId).map(burndown -> {
        Completeness c = burndown == null || burndown.getDataPoints().isEmpty()
            ? Completeness.NO_DATA
            : Completeness.PARTIAL;  // Always PARTIAL — isApproximate
        List<DashboardWarning> warnings = new ArrayList<>();
        if (c == Completeness.PARTIAL) {
            warnings.add(new DashboardWarning(
                "BURNDOWN_APPROXIMATE",
                "Based on updated_at proxy, not status change history"));
        }
        return wrapSection(burndown, LocalDateTime.now(),
            "project:" + projectId,
            List.of("task.sprints", "task.user_stories"),
            List.of("DASH_BURNDOWN_V1"),
            c, warnings);
    });
}
```

### 2-1. Phase Progress Endpoint

**Endpoint**: `GET /api/v2/projects/{projectId}/dashboard/phase-progress`

**Progress Definition Decision**:

The `phases.progress` column may be manually entered or computed. This must be resolved before displaying it as authoritative:

| Strategy | When to Use | Query |
|---|---|---|
| **Use `phases.progress` directly** | If progress is manually maintained by PM | `SELECT progress FROM project.phases` |
| **Derive from tasks** | If progress should reflect actual task completion | `AVG(wbs_tasks.progress) WHERE phase_id = ?` |
| **Hybrid** | Show both, let user see discrepancy | Both columns side-by-side |

**Recommended**: Use `phases.progress` as the primary value but add a `derivedProgress` field computed from tasks. If the two diverge by more than 20%, add a warning.

**Response DTO**:
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PhaseProgressDto {
    private List<PhaseMetric> phases;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PhaseMetric {
        private String phaseId;
        private String phaseName;
        private Integer orderNum;
        private String trackType;
        private Integer reportedProgress;  // from phases.progress (may be manual)
        private Integer derivedProgress;   // AVG(wbs_tasks.progress) for this phase
        private Integer plannedProgress;   // always 100
        private String status;
        private String derivedStatus;      // server-derived: normal/warning/danger
        private List<StatusReasonCode> statusReasons;
        private String gateStatus;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}
```

**SQL** (queryId: `DASH_PHASE_PROGRESS_V1`):
```sql
SELECT
    ph.id, ph.name, ph.order_num, ph.track_type,
    ph.progress as reported_progress,
    ph.status, ph.gate_status, ph.start_date, ph.end_date,
    task_agg.derived_progress,  -- NULL when no tasks exist (not 0)
    task_agg.task_count
FROM project.phases ph
LEFT JOIN (
    SELECT wt.phase_id,
           ROUND(AVG(wt.progress)) as derived_progress,
           COUNT(*) as task_count
    FROM project.wbs_tasks wt
    JOIN project.phases ph2 ON wt.phase_id = ph2.id
    WHERE ph2.project_id = :projectId   -- Project scope filter prevents cross-project contamination
    GROUP BY wt.phase_id
) task_agg ON task_agg.phase_id = ph.id
WHERE ph.project_id = :projectId AND ph.parent_id IS NULL
ORDER BY ph.order_num ASC
```

> **Key change from v2**: `derived_progress` is `NULL` (not `COALESCE(..., 0)`) when a phase has zero tasks. This correctly distinguishes "0% progress on existing tasks" from "no tasks assigned yet". The subquery also filters by `project_id` to prevent cross-project task aggregation if `phase_id` alone is not sufficiently scoped.

**Service-layer logic**:
```java
// In the mapping layer
Integer derivedProgress = row.get("task_count", Long.class) > 0
    ? row.get("derived_progress", Integer.class)
    : null;  // No tasks → null, not 0
```

**Divergence warning**: If `|reportedProgress - derivedProgress| > 20` and both are non-null, add a warning:
```java
if (derivedProgress != null && Math.abs(reported - derivedProgress) > 20) {
    warnings.add(new DashboardWarning(
        "PROGRESS_DIVERGENCE",
        "Reported progress (" + reported + "%) diverges from task-derived progress (" +
        derivedProgress + "%) by more than 20 points"));
}
```

### 2-2. Part Leader Statistics Endpoint

**Endpoint**: `GET /api/v2/projects/{projectId}/dashboard/part-stats`

**Response DTO**:
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PartStatsDto {
    private List<PartLeaderMetric> parts;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PartLeaderMetric {
        private String partId;
        private String partName;
        private String leaderId;
        private String leaderName;
        private Long totalTasks;
        private Long completedTasks;
        private Long inProgressTasks;
        private Long blockedTasks;
        private String status;              // server-derived
        private List<StatusReasonCode> statusReasons; // e.g., [BLOCKED_RATIO_OVER_20_PCT]
    }
}
```

**SQL**:
```sql
SELECT p.id as part_id, p.name as part_name,
       p.leader_id, p.leader_name,
       COUNT(us.id) as total_tasks,
       COUNT(CASE WHEN us.status = 'DONE' THEN 1 END) as completed,
       COUNT(CASE WHEN us.status = 'IN_PROGRESS' THEN 1 END) as in_progress,
       COUNT(CASE WHEN us.status = 'BLOCKED' THEN 1 END) as blocked
FROM project.parts p
LEFT JOIN task.user_stories us ON us.part_id = p.id
WHERE p.project_id = :projectId AND p.status = 'ACTIVE'
GROUP BY p.id, p.name, p.leader_id, p.leader_name
ORDER BY p.name ASC
```

Status derivation is applied in the service layer using `StatusDerivation.derivePartStatus()`.

### 2-3. WBS Group (Sub-project) Status Endpoint

**Endpoint**: `GET /api/v2/projects/{projectId}/dashboard/wbs-group-stats`

**Response DTO**:
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WbsGroupStatsDto {
    private List<WbsGroupMetric> groups;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WbsGroupMetric {
        private String groupId;
        private String groupName;
        private String trackType;           // from parent phase's track_type
        private Integer progress;
        private String assigneeName;        // first assignee or group lead
        private String status;                          // server-derived
        private List<StatusReasonCode> statusReasons;   // typed enum values
    }
}
```

**SQL**:
```sql
SELECT wg.id, wg.name, wg.progress,
       ph.track_type,
       u.name as assignee_name
FROM project.wbs_groups wg
JOIN project.phases ph ON wg.phase_id = ph.id
LEFT JOIN (
    SELECT wt.group_id, MIN(u.name) as name
    FROM project.wbs_tasks wt
    JOIN auth.users u ON wt.assignee_id = u.id
    GROUP BY wt.group_id
) u ON u.group_id = wg.id
WHERE ph.project_id = :projectId
ORDER BY ph.order_num, wg.order_num
```

### 2-4. Sprint Velocity Endpoint

**Endpoint**: `GET /api/v2/projects/{projectId}/dashboard/sprint-velocity`

**Data Source Decision**:

The `task.weekly_reports` table may contain **snapshot** values (cumulative) or **delta** values (per-week). Using `SUM()` on snapshots would produce incorrect totals.

**Safe MVP approach**: Split sources by metric type:
- `velocity` → `AVG(weekly_reports.velocity)` (velocity is inherently a rate)
- `plannedPoints` / `completedPoints` → Derive from `user_stories` (ground truth, no snapshot ambiguity)

**Response DTO**:
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SprintVelocityDto {
    private List<SprintMetric> sprints;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SprintMetric {
        private String sprintId;
        private String sprintName;
        private String status;
        private Integer plannedPoints;      // from user_stories SUM
        private Integer completedPoints;    // from user_stories SUM WHERE DONE
        private Double velocity;            // from weekly_reports AVG (if available)
        private String velocitySource;      // "weekly_reports" or "user_stories"
    }
}
```

**SQL** (queryId: `DASH_SPRINT_VELOCITY_V1` — user_stories based):
```sql
SELECT s.id as sprint_id, s.name as sprint_name, s.status,
       SUM(COALESCE(us.story_points, 0)) as planned_points,
       SUM(CASE WHEN us.status = 'DONE' THEN COALESCE(us.story_points, 0) ELSE 0 END) as completed_points,
       COUNT(us.id) as story_count,
       COUNT(CASE WHEN us.story_points IS NULL THEN 1 END) as null_points_count
FROM task.sprints s
LEFT JOIN task.user_stories us ON us.sprint_id = s.id
WHERE s.project_id = :projectId
GROUP BY s.id, s.name, s.status, s.start_date
ORDER BY s.start_date ASC
```

> **Key change from v2**: `COALESCE` is applied per-row (`COALESCE(us.story_points, 0)`) inside `SUM`, not wrapping the entire `SUM`. This correctly handles nullable `story_points` on individual user stories. The `null_points_count` column enables the service layer to detect incomplete estimation.

**SQL** (queryId: `DASH_SPRINT_VELOCITY_WR_V1` — velocity enrichment from weekly_reports):
```sql
SELECT sprint_id, AVG(velocity) as avg_velocity
FROM task.weekly_reports
WHERE sprint_id IN (:sprintIds)
GROUP BY sprint_id
```

**Completeness determination** (service layer):
```java
// Per-sprint completeness
if (velocity == null) {
    // No weekly_reports → velocity unavailable
    metric.setVelocitySource("unavailable");
    // Section completeness cannot be COMPLETE
}
if (nullPointsCount > 0) {
    warnings.add(new DashboardWarning(
        "STORY_POINTS_NULL",
        nullPointsCount + " stories have no story_points estimated"));
}

// Section-level completeness
Completeness c;
if (sprints.isEmpty()) {
    c = Completeness.NO_DATA;
} else if (sprints.stream().anyMatch(s -> s.getVelocity() == null)) {
    c = Completeness.PARTIAL;  // weekly_reports missing for some sprints
} else {
    c = Completeness.COMPLETE;
}
```

If weekly_reports returns no data for a sprint, set `velocity = null` and `velocitySource = "unavailable"` — do NOT substitute a computed fallback without declaring it.

### 2-5. Burndown Chart Endpoint

**Endpoint**: `GET /api/v2/projects/{projectId}/dashboard/burndown?sprintId={sprintId}`

> **MVP Transparency**: This endpoint produces an **approximate** burndown. `user_stories.updated_at` is used as a proxy for "when status changed to DONE", but it may also reflect other updates. Until a `user_story_status_history` table exists, this is the best available signal.

**Response DTO**:
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BurndownDto {
    private String sprintId;
    private String sprintName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer totalPoints;
    private List<BurndownPoint> dataPoints;
    private Boolean isApproximate;  // always true until status history table exists

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BurndownPoint {
        private LocalDate date;
        private Integer remainingPoints;
        private Integer idealPoints;
    }
}
```

**SQL** (queryId: `DASH_BURNDOWN_V1` — approximate):
```sql
WITH sprint_info AS (
    SELECT id, start_date, end_date,
           COALESCE(SUM(COALESCE(us.story_points, 0)), 0) as total_points,
           COUNT(us.id) as story_count
    FROM task.sprints s
    LEFT JOIN task.user_stories us ON us.sprint_id = s.id
    WHERE s.id = :sprintId
    GROUP BY s.id, s.start_date, s.end_date
),
daily_done AS (
    SELECT DATE(us.updated_at) as done_date,
           SUM(COALESCE(us.story_points, 0)) as points_done
    FROM task.user_stories us
    WHERE us.sprint_id = :sprintId AND us.status = 'DONE'
    GROUP BY DATE(us.updated_at)
)
SELECT si.start_date, si.end_date, si.total_points, si.story_count,
       dd.done_date, dd.points_done
FROM sprint_info si
LEFT JOIN daily_done dd ON dd.done_date BETWEEN si.start_date AND si.end_date
ORDER BY dd.done_date ASC
```

**Continuous date series generation** (service layer):

The SQL returns only dates where completions occurred. The service layer must generate a continuous series from `startDate` to `min(endDate, today)` to produce a gap-free burndown chart:

```java
private BurndownDto buildBurndownWithContinuousDates(
        LocalDate start, LocalDate end, int totalPoints,
        Map<LocalDate, Integer> dailyDoneMap) {

    List<BurndownPoint> points = new ArrayList<>();
    int cumDone = 0;
    LocalDate effectiveEnd = end.isBefore(LocalDate.now()) ? end : LocalDate.now();
    long totalDays = ChronoUnit.DAYS.between(start, end);

    for (LocalDate d = start; !d.isAfter(effectiveEnd); d = d.plusDays(1)) {
        cumDone += dailyDoneMap.getOrDefault(d, 0);
        int remaining = totalPoints - cumDone;
        long dayIndex = ChronoUnit.DAYS.between(start, d);
        int ideal = totalPoints - (int)(totalPoints * dayIndex / totalDays);

        points.add(BurndownPoint.builder()
            .date(d)
            .remainingPoints(remaining)
            .idealPoints(ideal)
            .build());
    }
    return BurndownDto.builder()
        .dataPoints(points)
        .totalPoints(totalPoints)
        .isApproximate(true)
        .build();
}
```

> **Key change from v2**: The date series is now **continuous** — every calendar day between sprint start and `min(end, today)` appears in the output. Days with no completions carry forward the previous remaining value. This prevents jagged charts with missing date gaps.

**Completeness**: Always `PARTIAL` until a `user_story_status_history` table exists. If no stories exist (`story_count == 0`), set to `NO_DATA`.

```java
Completeness c = storyCount == 0
    ? Completeness.NO_DATA
    : Completeness.PARTIAL;  // Always PARTIAL — isApproximate

List<DashboardWarning> warnings = new ArrayList<>();
if (c == Completeness.PARTIAL) {
    warnings.add(new DashboardWarning(
        "BURNDOWN_APPROXIMATE",
        "Based on updated_at proxy, not status change history"));
}
```

---

## Phase 3: Budget Decision

**Objective**: Either implement budget tracking properly or remove it from the KPI area.

### Recommended: Option B (Remove as KPI, Keep as Info)

Budget expenditure tracking requires accounting workflows (categories, approval, periods) that exceed the scope of dashboard reliability work. Adding a `budget_items` table introduces a domain boundary that should be planned separately.

**Actions**:
- Remove budget execution rate card from project dashboard KPI row
- Move `budgetTotal` to an informational section (not card format):
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 프로젝트 정보
  예산 배정: ₩50억 (참고용 — 집행 추적 미도입)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```
- Backend: `getBudgetStats()` returns `completeness = NO_DATA` for spending metrics
- Future: When budget tracking is implemented as a separate feature, re-introduce the KPI card

---

## Phase 4: AI Insights (DB-Backed)

**Objective**: Replace hardcoded Korean text with structured insights derived from real data. No LLM required — pattern detection from SQL is sufficient.

### Insight DTO with Evidence

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class InsightDto {
    private String type;                // RISK, ACHIEVEMENT, RECOMMENDATION
    private String severity;            // HIGH, MEDIUM, LOW
    private String title;
    private String description;
    private LocalDateTime generatedAt;
    private String dataSource;          // "project.phases", "project.wbs_tasks"
    private InsightEvidence evidence;   // Proof that backs this insight

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InsightEvidence {
        private List<String> entityIds;     // phase IDs, task IDs, etc.
        private Map<String, Object> metrics; // {"avgProgress": 35, "overdueDays": 12}
    }
}
```

### Insight Generation Queries

**Risk: Phases behind schedule**
```sql
SELECT id, name, progress, end_date,
       (CURRENT_DATE - end_date) as overdue_days
FROM project.phases
WHERE project_id = :projectId
  AND end_date < CURRENT_DATE
  AND status != 'COMPLETED'
```
→ Generates: `"차질 위험: {count}개 Phase가 종료일 경과 (평균 진척 {avg}%)"`
→ Evidence: `{ entityIds: [phase IDs], metrics: { avgProgress: 35, overdueDays: 12 } }`

**Achievement: Recently completed milestones**
```sql
SELECT id, name, actual_end_date
FROM project.phases
WHERE project_id = :projectId
  AND status = 'COMPLETED'
  AND updated_at >= CURRENT_DATE - INTERVAL '7 days'
```
→ Generates: `"주간 성과: '{phaseName}' Phase 완료"`

**Recommendation: Blocked tasks accumulation**
```sql
SELECT COUNT(*) as blocked_count
FROM project.wbs_tasks wt
JOIN project.phases ph ON wt.phase_id = ph.id
WHERE ph.project_id = :projectId AND wt.status = 'BLOCKED'
```
→ If blocked_count > 0: `"권장 사항: {count}개 차단된 작업 해결 필요"`

> **Future**: Once these structured insights exist, the LLM service can be added as an optional enrichment layer that generates more natural language summaries — but the data and evidence remain the source of truth.

---

## Phase 5: Frontend Migration (Mock → Real)

**Objective**: Replace each mock import with real API data, one section at a time.

### Implementation Order (Risk-Optimized)

This order prioritizes sections where data accuracy is most certain, building confidence before tackling approximate data:

| Step | Section | Risk Level | Rationale |
|---|---|---|---|
| 1 | Phase Progress | Low | Direct DB column read, no aggregation ambiguity |
| 2 | Part Leader Stats | Low | Clear user_stories aggregation |
| 3 | WBS Group Stats | Low | Direct wbs_groups + phases join |
| 4 | Sprint Velocity | Medium | weekly_reports snapshot/delta needs verification |
| 5 | Burndown | Medium-High | Approximate data, needs `isApproximate` flag |
| 6 | AI Insights | Medium | Pattern detection, needs evidence validation |

### Per-Section Migration Checklist

For each section:

1. [ ] Create response DTO with `DashboardSection<T>` wrapper
2. [ ] Create service method in `ReactiveDashboardService`
3. [ ] Add to aggregation endpoint's `Mono.zip()`
4. [ ] Create individual endpoint in `ReactiveDashboardController`
5. [ ] Add API method in `api.ts` with `fetchWithFallback`
6. [ ] Create React Query hook in `useDashboard.ts`
7. [ ] Replace mock import with hook in `Dashboard.tsx`
8. [ ] Use `<StatValue>` for all numeric rendering
9. [ ] Handle `completeness` and `warnings` from meta
10. [ ] Remove `<DataSourceBadge>` wrapper
11. [ ] Remove mock export from `dashboard.mock.ts`
12. [ ] Add backend test: verify response contains `asOf`, `scope`, `completeness`
13. [ ] Add backend test: verify `null` returned (not `0`) when no data exists

### Frontend: Use Aggregation Endpoint First

```typescript
// api.ts
async getProjectDashboard(projectId: string) {
    return this.fetchWithFallback(
        `${V2}/projects/${projectId}/dashboard`, {}, null
    );
}

// useDashboard.ts
export function useProjectDashboard(projectId: string | null) {
    return useQuery<ProjectDashboardDto>({
        queryKey: dashboardKeys.projectFull(projectId!),
        queryFn: () => apiService.getProjectDashboard(projectId!),
        enabled: !!projectId,
    });
}
```

Individual section hooks remain for targeted refresh:
```typescript
export function usePhaseProgress(projectId: string | null) {
    return useQuery({
        queryKey: dashboardKeys.phaseProgress(projectId!),
        queryFn: () => apiService.getPhaseProgress(projectId!),
        enabled: !!projectId,
    });
}
```

---

## Phase 6: Automated Verification (Regression Prevention)

**Objective**: Prevent the dashboard from silently regressing to mock data or false zeros.

### 6-1. Frontend Build-Time Guard

Create an ESLint rule or build script that fails if mock chart data is imported into production components:

```javascript
// .eslintrc.js — custom rule or eslint-plugin-import restriction
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["**/mocks/dashboard.mock"],
        "importNames": ["subProjectData", "partLeaderData", "phaseData",
                        "sprintVelocity", "burndownData"],
        "message": "Dashboard chart mock data must not be imported in production components. Use API hooks instead."
      }]
    }]
  }
}
```

### 6-2. CI Grep Guards (Build-Time Regression Detection)

Add CI pipeline steps that **fail the build** if banned patterns reappear:

```yaml
# .github/workflows/ci.yml (or equivalent CI config)
dashboard-guards:
  runs-on: ubuntu-latest
  steps:
    - name: Ban mock data imports in Dashboard components
      run: |
        if grep -rn "from.*mocks/dashboard\.mock" \
          PMS_IC_FrontEnd_v1.2/src/app/components/Dashboard.tsx; then
          echo "ERROR: Dashboard.tsx imports mock data. Use API hooks instead."
          exit 1
        fi

    - name: Ban LIKE pattern matching for track classification
      run: |
        if grep -rn "LIKE.*%AI%" \
          PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/project/; then
          echo "ERROR: LIKE pattern matching for track found. Use phases.track_type column."
          exit 1
        fi

    - name: Ban hardcoded BigDecimal.ZERO for budget
      run: |
        if grep -rn "BigDecimal\.ZERO.*budget\|budget.*BigDecimal\.ZERO" \
          PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/project/reactive/service/ReactiveDashboardService.java; then
          echo "ERROR: Hardcoded BigDecimal.ZERO found in budget calculation."
          exit 1
        fi
```

> These are **cheap, fast guards** that catch regressions before they reach code review. They complement but do not replace the ESLint rule in 6-1 and the contract tests in 6-3.

### 6-3. Backend Contract Tests

For every dashboard endpoint, add tests that verify the data contract:

```java
@Test
void dashboardResponse_mustContainMeta() {
    webTestClient.get()
        .uri("/api/v2/projects/{id}/dashboard/phase-progress", testProjectId)
        .exchange()
        .expectStatus().isOk()
        .expectBody()
        .jsonPath("$.data.meta.asOf").isNotEmpty()
        .jsonPath("$.data.meta.scope").isEqualTo("project:" + testProjectId)
        .jsonPath("$.data.meta.completeness").isNotEmpty()
        .jsonPath("$.data.meta.sources").isArray()
        .jsonPath("$.data.meta.sources").isNotEmpty()
        .jsonPath("$.data.meta.queryIds").isArray()
        .jsonPath("$.data.meta.computeMs").isNumber();
}

@Test
void budgetStats_mustReturnNullNotZero_whenNoSpendingData() {
    webTestClient.get()
        .uri("/api/v2/projects/{id}/dashboard/stats", testProjectId)
        .exchange()
        .expectBody()
        .jsonPath("$.data.data.budgetSpent").isEmpty()          // null, not 0
        .jsonPath("$.data.data.budgetExecutionRate").isEmpty();  // null, not 0
}
```

### 6-4. Observability Metrics

Track `completeness` distribution and `computeMs` across dashboard API responses:

```java
// In DashboardService or safeSection wrapper
meterRegistry.counter("dashboard.section.completeness",
    "section", sectionName,
    "completeness", meta.getCompleteness().name()
).increment();

meterRegistry.timer("dashboard.section.compute_time",
    "section", sectionName
).record(meta.getComputeMs(), TimeUnit.MILLISECONDS);

if (Boolean.TRUE.equals(meta.getUsedFallback())) {
    meterRegistry.counter("dashboard.section.fallback",
        "section", sectionName
    ).increment();
}
```

Monitor for:
- Sudden increase in `NO_DATA` responses → data pipeline issue
- `PARTIAL` responses becoming persistent → underlying query degradation
- `warnings` list length growing → multiple fallbacks activating
- `computeMs` p95 exceeding threshold → query performance degradation
- `usedFallback=true` spike → primary data source failing

---

## Verification Checklist (Final Gate)

Every dashboard section must pass ALL of these checks before the migration is considered complete:

| # | Check | Automated? |
|---|---|---|
| 1 | Every visible number traces to a SQL query via `meta.sources` + `meta.queryIds` | Backend test |
| 2 | `dashboard.mock.ts` chart exports are deleted or unused | ESLint rule + CI grep |
| 3 | Every stat comes from `fetchWithFallback` to a real endpoint | Code review |
| 4 | Missing data shows "N/A" via `StatValue`, never fabricated `0` | Frontend test |
| 5 | No client-side `.filter()` / `.reduce()` for stats the server computes | Code review |
| 6 | `phases.track_type` used everywhere, no `LIKE` pattern matching | CI grep step |
| 7 | All responses include `asOf` / `scope` / `sources` / `queryIds` / `completeness` / `computeMs` | Backend test |
| 8 | Status derivation uses `StatusReasonCode` enum, not free-form strings | Code review |
| 9 | `completeness=NO_DATA` rate is monitored in observability | Ops dashboard |
| 10 | `track_type` column has NOT NULL constraint | Schema check |
| 11 | `completeness` is semantically determined per section (not `data != null`) | Code review |
| 12 | Aggregation endpoint isolates per-section errors via `onErrorResume` | Backend test |
| 13 | `warnings` use structured `DashboardWarning(code, message)`, not raw strings | Backend test |
| 14 | `computeMs` and `usedFallback` present in every response | Backend test |

---

## File Impact Summary

### Backend — Modify
| File | Changes |
|---|---|
| [ReactiveDashboardService.java](PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/project/reactive/service/ReactiveDashboardService.java) | Fix track classification, budget nullability, add 7 new methods, add aggregation |
| [ReactiveDashboardController.java](PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/project/controller/ReactiveDashboardController.java) | Add 7 new endpoints (6 sections + 1 aggregation) |
| [DashboardStats.java](PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/report/dto/DashboardStats.java) | Make budget fields `@Nullable` |

### Backend — Create
| File | Purpose |
|---|---|
| `DashboardSection.java` | Generic response envelope with `DashboardMeta`, `DashboardWarning`, `Completeness` |
| `StatusReasonCode.java` | Enum for typed status reason codes (closed set, not free-form) |
| `StatusDerivation.java` | Server-side status derivation rules returning `StatusResult` |
| `ProjectDashboardDto.java` | Aggregation response combining all sections |
| `PhaseProgressDto.java` | Phase progress with reported + derived values |
| `SprintVelocityDto.java` | Sprint velocity with source tracking |
| `BurndownDto.java` | Burndown with `isApproximate` flag |
| `PartStatsDto.java` | Part leader stats with `statusReasons` |
| `WbsGroupStatsDto.java` | WBS group stats with track type |
| `InsightDto.java` | Structured insights with `evidence` |
| `V20260205__backfill_track_type.sql` | Migration: backfill + NOT NULL constraint |

### Frontend — Modify
| File | Changes |
|---|---|
| [Dashboard.tsx](PMS_IC_FrontEnd_v1.2/src/app/components/Dashboard.tsx) | Replace all mock imports, use hooks, use `StatValue` |
| [api.ts](PMS_IC_FrontEnd_v1.2/src/services/api.ts) | Add 7+ new API methods |
| [useDashboard.ts](PMS_IC_FrontEnd_v1.2/src/hooks/api/useDashboard.ts) | Add 7+ new hooks, add aggregation hook |

### Frontend — Create
| File | Purpose |
|---|---|
| `StatValue.tsx` | Common numeric renderer with null/partial/complete handling |
| `DataSourceBadge.tsx` | 3-tier badge (NOT_CONNECTED / SAMPLE / CONCEPT) |

### Frontend — Clean Up
| File | Action |
|---|---|
| [dashboard.mock.ts](PMS_IC_FrontEnd_v1.2/src/mocks/dashboard.mock.ts) | Remove `subProjectData`, `partLeaderData`, `phaseData`, `sprintVelocity`, `burndownData` |
| `.eslintrc` | Add `no-restricted-imports` for mock chart data |

### CI/CD — Create
| File | Purpose |
|---|---|
| CI pipeline config | Add grep guards: mock import ban, LIKE pattern ban, BigDecimal.ZERO ban |
