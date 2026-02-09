package com.insuretech.pms.ai.service;

import com.insuretech.pms.ai.dto.RawProjectMetrics;
import com.insuretech.pms.ai.dto.RawProjectMetrics.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;

/**
 * Aggregates raw project metrics from PostgreSQL using parallel queries.
 * Provides data for the AI rule engine to detect insights.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiDataAggregationService {

    private final DatabaseClient databaseClient;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    public Mono<RawProjectMetrics> aggregateMetrics(String projectId, String scope) {
        return Mono.zip(
                queryOverdueTasks(projectId),
                querySprintProgress(projectId),
                queryAssigneeWorkload(projectId),
                queryOpenIssues(projectId),
                queryRecentActivity(projectId, scope)
        ).map(tuple -> RawProjectMetrics.builder()
                .overdueTasks(tuple.getT1())
                .sprintProgress(tuple.getT2())
                .assigneeWorkload(tuple.getT3())
                .openIssues(tuple.getT4())
                .recentActivity(tuple.getT5())
                .build()
        ).doOnSuccess(m -> log.debug("Aggregated metrics for project={}: overdue={}, issues={}",
                projectId, m.overdueTasks().size(), m.openIssues().size()));
    }

    /**
     * Checks data completeness -- returns missing signal names.
     */
    public List<String> checkCompleteness(RawProjectMetrics metrics) {
        var missing = new java.util.ArrayList<String>();
        if (metrics.sprintProgress() == null || metrics.sprintProgress().sprintId() == null) {
            missing.add("active_sprint");
        }
        if (metrics.assigneeWorkload() == null || metrics.assigneeWorkload().isEmpty()) {
            missing.add("assignee_data");
        }
        if (metrics.recentActivity() == null || metrics.recentActivity().totalActivities() == 0) {
            missing.add("recent_activity");
        }
        return missing;
    }

    private Mono<List<OverdueTask>> queryOverdueTasks(String projectId) {
        return databaseClient
                .sql("""
                    SELECT t.id, t.title, t.assignee_id,
                           COALESCE(u.name, u.username, 'Unassigned') AS assignee_name,
                           t.due_date,
                           (CURRENT_DATE - t.due_date) AS delay_days
                    FROM task.tasks t
                    LEFT JOIN auth.users u ON t.assignee_id = u.id
                    WHERE t.project_id = :projectId
                      AND t.due_date < CURRENT_DATE
                      AND t.status NOT IN ('DONE', 'TESTING')
                    ORDER BY delay_days DESC
                    """)
                .bind("projectId", projectId)
                .map((row, meta) -> OverdueTask.builder()
                        .id(row.get("id", String.class))
                        .title(row.get("title", String.class))
                        .assigneeId(row.get("assignee_id", String.class))
                        .assigneeName(row.get("assignee_name", String.class))
                        .dueDate(toOffsetDateTime(row.get("due_date", LocalDate.class)))
                        .delayDays(safeInt(row.get("delay_days", Integer.class)))
                        .build())
                .all()
                .collectList()
                .onErrorResume(e -> {
                    log.warn("Failed to query overdue tasks for project={}: {}", projectId, e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    private Mono<SprintProgress> querySprintProgress(String projectId) {
        return databaseClient
                .sql("""
                    SELECT s.id AS sprint_id, s.name AS sprint_name,
                           s.start_date, s.end_date,
                           COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) AS completed,
                           COUNT(t.id) AS total,
                           CASE WHEN COUNT(t.id) > 0
                                THEN ROUND(COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::numeric
                                           / COUNT(t.id) * 100, 1)
                                ELSE 0 END AS progress_pct
                    FROM task.sprints s
                    LEFT JOIN task.tasks t ON t.sprint_id = s.id
                    WHERE s.project_id = :projectId
                      AND s.status = 'ACTIVE'
                    GROUP BY s.id, s.name, s.start_date, s.end_date
                    LIMIT 1
                    """)
                .bind("projectId", projectId)
                .map((row, meta) -> SprintProgress.builder()
                        .sprintId(row.get("sprint_id", String.class))
                        .sprintName(row.get("sprint_name", String.class))
                        .startDate(toOffsetDateTime(row.get("start_date", LocalDate.class)))
                        .endDate(toOffsetDateTime(row.get("end_date", LocalDate.class)))
                        .completed(safeInt(row.get("completed", Long.class)))
                        .total(safeInt(row.get("total", Long.class)))
                        .progressPct(safeDouble(row.get("progress_pct", java.math.BigDecimal.class)))
                        .build())
                .one()
                .defaultIfEmpty(SprintProgress.builder()
                        .sprintId(null).sprintName(null).startDate(null).endDate(null)
                        .completed(0).total(0).progressPct(0.0)
                        .build())
                .onErrorResume(e -> {
                    log.warn("Failed to query sprint progress for project={}: {}", projectId, e.getMessage());
                    return Mono.just(SprintProgress.builder()
                            .sprintId(null).sprintName(null).startDate(null).endDate(null)
                            .completed(0).total(0).progressPct(0.0)
                            .build());
                });
    }

    private Mono<List<AssigneeWorkload>> queryAssigneeWorkload(String projectId) {
        return databaseClient
                .sql("""
                    SELECT t.assignee_id,
                           COALESCE(u.name, u.username, 'Unknown') AS assignee_name,
                           COUNT(*) AS active_tasks
                    FROM task.tasks t
                    JOIN auth.users u ON t.assignee_id = u.id
                    WHERE t.project_id = :projectId
                      AND t.status IN ('TODO', 'IN_PROGRESS', 'REVIEW')
                      AND t.assignee_id IS NOT NULL
                    GROUP BY t.assignee_id, u.name, u.username
                    ORDER BY active_tasks DESC
                    """)
                .bind("projectId", projectId)
                .map((row, meta) -> AssigneeWorkload.builder()
                        .assigneeId(row.get("assignee_id", String.class))
                        .assigneeName(row.get("assignee_name", String.class))
                        .activeTasks(safeInt(row.get("active_tasks", Long.class)))
                        .build())
                .all()
                .collectList()
                .onErrorResume(e -> {
                    log.warn("Failed to query assignee workload for project={}: {}", projectId, e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    private Mono<List<OpenIssue>> queryOpenIssues(String projectId) {
        return databaseClient
                .sql("""
                    SELECT i.id, i.title, i.priority AS severity, i.status, i.created_at
                    FROM project.issues i
                    WHERE i.project_id = :projectId
                      AND i.status NOT IN ('CLOSED', 'RESOLVED', 'VERIFIED')
                    ORDER BY
                      CASE i.priority
                        WHEN 'CRITICAL' THEN 0
                        WHEN 'HIGH' THEN 1
                        WHEN 'MEDIUM' THEN 2
                        ELSE 3
                      END
                    """)
                .bind("projectId", projectId)
                .map((row, meta) -> OpenIssue.builder()
                        .id(row.get("id", String.class))
                        .title(row.get("title", String.class))
                        .severity(row.get("severity", String.class))
                        .status(row.get("status", String.class))
                        .createdAt(toOffsetDateTimeFromLdt(row.get("created_at", java.time.LocalDateTime.class)))
                        .build())
                .all()
                .collectList()
                .onErrorResume(e -> {
                    log.warn("Failed to query open issues for project={}: {}", projectId, e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    private Mono<RecentActivity> queryRecentActivity(String projectId, String scope) {
        int days = switch (scope) {
            case "last_7_days" -> 7;
            case "last_14_days" -> 14;
            case "current_phase" -> 30;
            default -> 7; // current_sprint default
        };
        return databaseClient
                .sql("""
                    SELECT COUNT(*) AS total,
                           MAX(t.updated_at) AS last_activity
                    FROM task.tasks t
                    WHERE t.project_id = :projectId
                      AND t.updated_at > NOW() - CAST(:days || ' days' AS interval)
                    """)
                .bind("projectId", projectId)
                .bind("days", String.valueOf(days))
                .map((row, meta) -> RecentActivity.builder()
                        .totalActivities(safeInt(row.get("total", Long.class)))
                        .lastActivity(row.get("last_activity", java.time.LocalDateTime.class) != null
                                ? toOffsetDateTimeFromLdt(row.get("last_activity", java.time.LocalDateTime.class))
                                : null)
                        .build())
                .one()
                .defaultIfEmpty(RecentActivity.builder().totalActivities(0).lastActivity(null).build())
                .onErrorResume(e -> {
                    log.warn("Failed to query recent activity for project={}: {}", projectId, e.getMessage());
                    return Mono.just(RecentActivity.builder().totalActivities(0).lastActivity(null).build());
                });
    }

    private static OffsetDateTime toOffsetDateTime(LocalDate date) {
        if (date == null) return null;
        return date.atStartOfDay(KST).toOffsetDateTime();
    }

    private static OffsetDateTime toOffsetDateTimeFromLdt(java.time.LocalDateTime ldt) {
        if (ldt == null) return null;
        return ldt.atZone(KST).toOffsetDateTime();
    }

    private static int safeInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Long l) return l.intValue();
        if (val instanceof Integer i) return i;
        return 0;
    }

    private static double safeDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof java.math.BigDecimal bd) return bd.doubleValue();
        if (val instanceof Double d) return d;
        return 0.0;
    }
}
