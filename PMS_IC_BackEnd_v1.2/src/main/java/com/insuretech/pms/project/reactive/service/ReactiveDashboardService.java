package com.insuretech.pms.project.reactive.service;

import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import com.insuretech.pms.project.reactive.repository.ReactiveIssueRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import com.insuretech.pms.report.dto.DashboardStats;
import com.insuretech.pms.report.dto.WeightedProgressDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for dashboard statistics from real database data.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveDashboardService {

    private final ReactiveProjectRepository projectRepository;
    private final ReactiveIssueRepository issueRepository;
    private final DatabaseClient databaseClient;

    /**
     * Get portfolio-wide dashboard statistics (aggregated across all projects).
     */
    public Mono<DashboardStats> getPortfolioStats() {
        return Mono.zip(
                getProjectStats(),
                getTaskStats(null),
                getIssueStats(null),
                getBudgetStats(null)
        ).map(tuple -> {
            Map<String, Object> projectStats = tuple.getT1();
            Map<String, Object> taskStats = tuple.getT2();
            Map<String, Object> issueStats = tuple.getT3();
            Map<String, Object> budgetStats = tuple.getT4();

            @SuppressWarnings("unchecked")
            Map<String, Long> projectsByStatus = (Map<String, Long>) projectStats.get("byStatus");
            @SuppressWarnings("unchecked")
            Map<String, Long> tasksByStatus = (Map<String, Long>) taskStats.get("byStatus");

            return DashboardStats.builder()
                    .isPortfolioView(true)
                    .projectId(null)
                    .projectName(null)
                    .totalProjects((Long) projectStats.get("total"))
                    .activeProjects((Long) projectStats.get("active"))
                    .projectsByStatus(projectsByStatus)
                    .totalTasks((Long) taskStats.get("total"))
                    .completedTasks((Long) taskStats.get("completed"))
                    .inProgressTasks((Long) taskStats.get("inProgress"))
                    .avgProgress((Integer) taskStats.get("avgProgress"))
                    .tasksByStatus(tasksByStatus)
                    .totalIssues((Long) issueStats.get("total"))
                    .openIssues((Long) issueStats.get("open"))
                    .highPriorityIssues((Long) issueStats.get("highPriority"))
                    .budgetTotal((BigDecimal) budgetStats.get("total"))
                    .budgetSpent((BigDecimal) budgetStats.get("spent"))
                    .budgetExecutionRate((Integer) budgetStats.get("executionRate"))
                    .build();
        });
    }

    /**
     * Get project-specific dashboard statistics.
     */
    public Mono<DashboardStats> getProjectStats(String projectId) {
        return Mono.zip(
                projectRepository.findById(projectId).defaultIfEmpty(R2dbcProject.builder().build()),
                getTaskStats(projectId),
                getIssueStats(projectId),
                getBudgetStats(projectId)
        ).map(tuple -> {
            R2dbcProject project = tuple.getT1();
            Map<String, Object> taskStats = tuple.getT2();
            Map<String, Object> issueStats = tuple.getT3();
            Map<String, Object> budgetStats = tuple.getT4();

            @SuppressWarnings("unchecked")
            Map<String, Long> tasksByStatus = (Map<String, Long>) taskStats.get("byStatus");

            return DashboardStats.builder()
                    .isPortfolioView(false)
                    .projectId(projectId)
                    .projectName(project.getName())
                    .totalProjects(1L)
                    .activeProjects(1L)
                    .projectsByStatus(Map.of(project.getStatus() != null ? project.getStatus() : "UNKNOWN", 1L))
                    .totalTasks((Long) taskStats.get("total"))
                    .completedTasks((Long) taskStats.get("completed"))
                    .inProgressTasks((Long) taskStats.get("inProgress"))
                    .avgProgress(project.getProgress() != null ? project.getProgress() : (Integer) taskStats.get("avgProgress"))
                    .tasksByStatus(tasksByStatus)
                    .totalIssues((Long) issueStats.get("total"))
                    .openIssues((Long) issueStats.get("open"))
                    .highPriorityIssues((Long) issueStats.get("highPriority"))
                    .budgetTotal((BigDecimal) budgetStats.get("total"))
                    .budgetSpent((BigDecimal) budgetStats.get("spent"))
                    .budgetExecutionRate((Integer) budgetStats.get("executionRate"))
                    .build();
        });
    }

    /**
     * Get weighted progress for a project based on AI/SI/Common tracks.
     */
    public Mono<WeightedProgressDto> getWeightedProgress(String projectId) {
        String query = """
            WITH track_stats AS (
                SELECT
                    CASE
                        WHEN p.name LIKE '%AI%' OR wg.name LIKE '%AI%' OR wg.name LIKE '%모델%' OR wg.name LIKE '%OCR%' THEN 'AI'
                        WHEN p.name LIKE '%SI%' OR wg.name LIKE '%연동%' OR wg.name LIKE '%레거시%' OR wg.name LIKE '%마이그레이션%' THEN 'SI'
                        ELSE 'COMMON'
                    END as track,
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN wt.status = 'COMPLETED' THEN 1 END) as completed_tasks,
                    AVG(COALESCE(wt.progress, 0)) as avg_progress
                FROM project.wbs_tasks wt
                JOIN project.wbs_groups wg ON wt.group_id = wg.id
                JOIN project.phases p ON wt.phase_id = p.id
                WHERE p.project_id = :projectId
                GROUP BY track
            ),
            project_weights AS (
                SELECT ai_weight, si_weight, (1 - ai_weight - si_weight) as common_weight
                FROM project.projects WHERE id = :projectId
            )
            SELECT
                ts.track,
                ts.total_tasks,
                ts.completed_tasks,
                ts.avg_progress,
                pw.ai_weight,
                pw.si_weight,
                pw.common_weight
            FROM track_stats ts
            CROSS JOIN project_weights pw
            """;

        return databaseClient.sql(query)
                .bind("projectId", projectId)
                .fetch()
                .all()
                .collectList()
                .flatMap(rows -> {
                    if (rows.isEmpty()) {
                        return getDefaultWeightedProgress(projectId);
                    }

                    long aiTotal = 0, aiCompleted = 0, siTotal = 0, siCompleted = 0, commonTotal = 0, commonCompleted = 0;
                    double aiProgress = 0, siProgress = 0, commonProgress = 0;
                    BigDecimal aiWeight = new BigDecimal("0.70");
                    BigDecimal siWeight = new BigDecimal("0.30");
                    BigDecimal commonWeight = BigDecimal.ZERO;

                    for (Map<String, Object> row : rows) {
                        String track = (String) row.get("track");
                        long total = ((Number) row.get("total_tasks")).longValue();
                        long completed = ((Number) row.get("completed_tasks")).longValue();
                        double progress = ((Number) row.get("avg_progress")).doubleValue();

                        if (row.get("ai_weight") != null) {
                            aiWeight = (BigDecimal) row.get("ai_weight");
                            siWeight = (BigDecimal) row.get("si_weight");
                            commonWeight = (BigDecimal) row.get("common_weight");
                        }

                        switch (track) {
                            case "AI" -> {
                                aiTotal = total;
                                aiCompleted = completed;
                                aiProgress = progress;
                            }
                            case "SI" -> {
                                siTotal = total;
                                siCompleted = completed;
                                siProgress = progress;
                            }
                            default -> {
                                commonTotal = total;
                                commonCompleted = completed;
                                commonProgress = progress;
                            }
                        }
                    }

                    double weightedProgress = aiProgress * aiWeight.doubleValue()
                            + siProgress * siWeight.doubleValue()
                            + commonProgress * commonWeight.doubleValue();

                    return Mono.just(WeightedProgressDto.builder()
                            .aiProgress(aiProgress)
                            .siProgress(siProgress)
                            .commonProgress(commonProgress)
                            .weightedProgress(weightedProgress)
                            .aiWeight(aiWeight)
                            .siWeight(siWeight)
                            .commonWeight(commonWeight)
                            .aiTotalTasks(aiTotal)
                            .aiCompletedTasks(aiCompleted)
                            .siTotalTasks(siTotal)
                            .siCompletedTasks(siCompleted)
                            .commonTotalTasks(commonTotal)
                            .commonCompletedTasks(commonCompleted)
                            .totalTasks(aiTotal + siTotal + commonTotal)
                            .completedTasks(aiCompleted + siCompleted + commonCompleted)
                            .build());
                });
    }

    private Mono<WeightedProgressDto> getDefaultWeightedProgress(String projectId) {
        return projectRepository.findById(projectId)
                .map(project -> WeightedProgressDto.builder()
                        .aiProgress(0.0)
                        .siProgress(0.0)
                        .commonProgress(0.0)
                        .weightedProgress(0.0)
                        .aiWeight(project.getAiWeight() != null ? project.getAiWeight() : new BigDecimal("0.70"))
                        .siWeight(project.getSiWeight() != null ? project.getSiWeight() : new BigDecimal("0.30"))
                        .commonWeight(BigDecimal.ZERO)
                        .aiTotalTasks(0L)
                        .aiCompletedTasks(0L)
                        .siTotalTasks(0L)
                        .siCompletedTasks(0L)
                        .commonTotalTasks(0L)
                        .commonCompletedTasks(0L)
                        .totalTasks(0L)
                        .completedTasks(0L)
                        .build())
                .defaultIfEmpty(WeightedProgressDto.builder()
                        .aiProgress(0.0)
                        .siProgress(0.0)
                        .commonProgress(0.0)
                        .weightedProgress(0.0)
                        .aiWeight(new BigDecimal("0.70"))
                        .siWeight(new BigDecimal("0.30"))
                        .commonWeight(BigDecimal.ZERO)
                        .totalTasks(0L)
                        .completedTasks(0L)
                        .build());
    }

    // ========== Private Helper Methods ==========

    private Mono<Map<String, Object>> getProjectStats() {
        String countQuery = """
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'PLANNING' THEN 1 END) as planning,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'ON_HOLD' THEN 1 END) as on_hold,
                COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
            FROM project.projects
            """;

        return databaseClient.sql(countQuery)
                .fetch()
                .one()
                .map(row -> {
                    Map<String, Object> stats = new HashMap<>();
                    stats.put("total", ((Number) row.get("total")).longValue());
                    stats.put("active", ((Number) row.get("active")).longValue());

                    Map<String, Long> byStatus = new HashMap<>();
                    byStatus.put("PLANNING", ((Number) row.get("planning")).longValue());
                    byStatus.put("IN_PROGRESS", ((Number) row.get("active")).longValue());
                    byStatus.put("COMPLETED", ((Number) row.get("completed")).longValue());
                    byStatus.put("ON_HOLD", ((Number) row.get("on_hold")).longValue());
                    byStatus.put("CANCELLED", ((Number) row.get("cancelled")).longValue());
                    stats.put("byStatus", byStatus);

                    return stats;
                })
                .defaultIfEmpty(Map.of("total", 0L, "active", 0L, "byStatus", Map.of()));
    }

    private Mono<Map<String, Object>> getTaskStats(String projectId) {
        String query = projectId != null
                ? """
                    SELECT
                        COUNT(*) as total,
                        COUNT(CASE WHEN wt.status = 'COMPLETED' THEN 1 END) as completed,
                        COUNT(CASE WHEN wt.status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                        COUNT(CASE WHEN wt.status = 'NOT_STARTED' THEN 1 END) as not_started,
                        COALESCE(AVG(wt.progress), 0) as avg_progress
                    FROM project.wbs_tasks wt
                    JOIN project.phases p ON wt.phase_id = p.id
                    WHERE p.project_id = :projectId
                  """
                : """
                    SELECT
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                        COUNT(CASE WHEN status = 'NOT_STARTED' THEN 1 END) as not_started,
                        COALESCE(AVG(progress), 0) as avg_progress
                    FROM project.wbs_tasks
                  """;

        var spec = databaseClient.sql(query);
        if (projectId != null) {
            spec = spec.bind("projectId", projectId);
        }

        return spec.fetch()
                .one()
                .map(row -> {
                    Map<String, Object> stats = new HashMap<>();
                    long total = ((Number) row.get("total")).longValue();
                    long completed = ((Number) row.get("completed")).longValue();
                    long inProgress = ((Number) row.get("in_progress")).longValue();

                    stats.put("total", total);
                    stats.put("completed", completed);
                    stats.put("inProgress", inProgress);
                    stats.put("avgProgress", total > 0
                            ? (int) Math.round(((Number) row.get("avg_progress")).doubleValue())
                            : 0);

                    Map<String, Long> byStatus = new HashMap<>();
                    byStatus.put("COMPLETED", completed);
                    byStatus.put("IN_PROGRESS", inProgress);
                    byStatus.put("NOT_STARTED", ((Number) row.get("not_started")).longValue());
                    stats.put("byStatus", byStatus);

                    return stats;
                })
                .defaultIfEmpty(Map.of("total", 0L, "completed", 0L, "inProgress", 0L, "avgProgress", 0, "byStatus", Map.of()));
    }

    private Mono<Map<String, Object>> getIssueStats(String projectId) {
        String query = projectId != null
                ? """
                    SELECT
                        COUNT(*) as total,
                        COUNT(CASE WHEN status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as open,
                        COUNT(CASE WHEN priority = 'HIGH' AND status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as high_priority
                    FROM project.issues
                    WHERE project_id = :projectId
                  """
                : """
                    SELECT
                        COUNT(*) as total,
                        COUNT(CASE WHEN status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as open,
                        COUNT(CASE WHEN priority = 'HIGH' AND status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as high_priority
                    FROM project.issues
                  """;

        var spec = databaseClient.sql(query);
        if (projectId != null) {
            spec = spec.bind("projectId", projectId);
        }

        return spec.fetch()
                .one()
                .map(row -> {
                    Map<String, Object> stats = new HashMap<>();
                    stats.put("total", ((Number) row.get("total")).longValue());
                    stats.put("open", ((Number) row.get("open")).longValue());
                    stats.put("highPriority", ((Number) row.get("high_priority")).longValue());
                    return stats;
                })
                .defaultIfEmpty(Map.of("total", 0L, "open", 0L, "highPriority", 0L));
    }

    private Mono<Map<String, Object>> getBudgetStats(String projectId) {
        String query = projectId != null
                ? "SELECT COALESCE(budget, 0) as total FROM project.projects WHERE id = :projectId"
                : "SELECT COALESCE(SUM(budget), 0) as total FROM project.projects";

        var spec = databaseClient.sql(query);
        if (projectId != null) {
            spec = spec.bind("projectId", projectId);
        }

        return spec.fetch()
                .one()
                .map(row -> {
                    Map<String, Object> stats = new HashMap<>();
                    BigDecimal total = (BigDecimal) row.get("total");
                    BigDecimal spent = BigDecimal.ZERO; // Budget spent tracking not yet implemented
                    int executionRate = 0;

                    if (total != null && total.compareTo(BigDecimal.ZERO) > 0) {
                        executionRate = spent.multiply(BigDecimal.valueOf(100))
                                .divide(total, 0, RoundingMode.HALF_UP)
                                .intValue();
                    }

                    stats.put("total", total != null ? total : BigDecimal.ZERO);
                    stats.put("spent", spent);
                    stats.put("executionRate", executionRate);
                    return stats;
                })
                .defaultIfEmpty(Map.of("total", BigDecimal.ZERO, "spent", BigDecimal.ZERO, "executionRate", 0));
    }
}
