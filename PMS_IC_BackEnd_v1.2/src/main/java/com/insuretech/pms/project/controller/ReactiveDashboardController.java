package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.reactive.service.ReactiveDashboardService;
import com.insuretech.pms.report.dto.DashboardStats;
import com.insuretech.pms.report.dto.WeightedProgressDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Reactive REST Controller for dashboard statistics.
 * Provides portfolio-wide and project-specific dashboard data from real database.
 */
@Slf4j
@RestController
@RequestMapping("/api/v2")
@RequiredArgsConstructor
public class ReactiveDashboardController {

    private final ReactiveDashboardService dashboardService;
    private final DatabaseClient databaseClient;

    // ========== Portfolio Dashboard (aggregated across all projects) ==========

    @GetMapping("/dashboard/stats")
    public Mono<ResponseEntity<ApiResponse<DashboardStats>>> getPortfolioDashboardStats() {
        log.debug("Getting portfolio dashboard stats from database");
        return dashboardService.getPortfolioStats()
                .map(stats -> ResponseEntity.ok(ApiResponse.success(stats)))
                .doOnSuccess(resp -> log.debug("Portfolio stats retrieved successfully"))
                .doOnError(e -> log.error("Failed to get portfolio stats", e));
    }

    @GetMapping("/dashboard/activities")
    public Mono<ResponseEntity<ApiResponse<List<ActivityDto>>>> getPortfolioActivities() {
        log.debug("Getting portfolio activities from database");

        String query = """
            SELECT
                u.name as user_name,
                'Updated task: ' || wt.name as action,
                wt.updated_at as activity_time,
                CASE
                    WHEN wt.status = 'COMPLETED' THEN 'success'
                    WHEN wt.status = 'IN_PROGRESS' THEN 'info'
                    ELSE 'warning'
                END as activity_type,
                p.id as project_id,
                p.name as project_name
            FROM project.wbs_tasks wt
            JOIN project.phases ph ON wt.phase_id = ph.id
            JOIN project.projects p ON ph.project_id = p.id
            LEFT JOIN auth.users u ON wt.updated_by = u.id
            WHERE wt.updated_at IS NOT NULL
            ORDER BY wt.updated_at DESC
            LIMIT 10
            """;

        return databaseClient.sql(query)
                .fetch()
                .all()
                .map(row -> ActivityDto.builder()
                        .user(row.get("user_name") != null ? (String) row.get("user_name") : "System")
                        .action((String) row.get("action"))
                        .time(formatRelativeTime(row.get("activity_time")))
                        .type((String) row.get("activity_type"))
                        .projectId((String) row.get("project_id"))
                        .projectName((String) row.get("project_name"))
                        .build())
                .collectList()
                .flatMap(activities -> {
                    if (activities.isEmpty()) {
                        return Mono.just(getDefaultActivities());
                    }
                    return Mono.just(activities);
                })
                .map(activities -> ResponseEntity.ok(ApiResponse.success(activities)));
    }

    // ========== Project-specific Dashboard ==========

    @GetMapping("/projects/{projectId}/dashboard/stats")
    public Mono<ResponseEntity<ApiResponse<DashboardStats>>> getProjectDashboardStats(
            @PathVariable String projectId) {
        log.debug("Getting dashboard stats for project: {}", projectId);
        return dashboardService.getProjectStats(projectId)
                .map(stats -> ResponseEntity.ok(ApiResponse.success(stats)))
                .doOnSuccess(resp -> log.debug("Project stats retrieved successfully for: {}", projectId))
                .doOnError(e -> log.error("Failed to get project stats for: {}", projectId, e));
    }

    @GetMapping("/projects/{projectId}/dashboard/activities")
    public Mono<ResponseEntity<ApiResponse<List<ActivityDto>>>> getProjectActivities(
            @PathVariable String projectId) {
        log.debug("Getting activities for project: {}", projectId);

        String query = """
            SELECT
                u.name as user_name,
                'Updated task: ' || wt.name as action,
                wt.updated_at as activity_time,
                CASE
                    WHEN wt.status = 'COMPLETED' THEN 'success'
                    WHEN wt.status = 'IN_PROGRESS' THEN 'info'
                    ELSE 'warning'
                END as activity_type,
                p.id as project_id,
                p.name as project_name
            FROM project.wbs_tasks wt
            JOIN project.phases ph ON wt.phase_id = ph.id
            JOIN project.projects p ON ph.project_id = p.id
            LEFT JOIN auth.users u ON wt.updated_by = u.id
            WHERE p.id = :projectId AND wt.updated_at IS NOT NULL
            ORDER BY wt.updated_at DESC
            LIMIT 10
            """;

        return databaseClient.sql(query)
                .bind("projectId", projectId)
                .fetch()
                .all()
                .map(row -> ActivityDto.builder()
                        .user(row.get("user_name") != null ? (String) row.get("user_name") : "System")
                        .action((String) row.get("action"))
                        .time(formatRelativeTime(row.get("activity_time")))
                        .type((String) row.get("activity_type"))
                        .projectId((String) row.get("project_id"))
                        .projectName((String) row.get("project_name"))
                        .build())
                .collectList()
                .flatMap(activities -> {
                    if (activities.isEmpty()) {
                        return Mono.just(getDefaultActivitiesForProject(projectId));
                    }
                    return Mono.just(activities);
                })
                .map(activities -> ResponseEntity.ok(ApiResponse.success(activities)));
    }

    @GetMapping("/projects/{projectId}/dashboard/weighted-progress")
    public Mono<ResponseEntity<ApiResponse<WeightedProgressDto>>> getWeightedProgress(
            @PathVariable String projectId) {
        log.debug("Getting weighted progress for project: {}", projectId);
        return dashboardService.getWeightedProgress(projectId)
                .map(progress -> ResponseEntity.ok(ApiResponse.success(progress)))
                .doOnSuccess(resp -> log.debug("Weighted progress retrieved successfully for: {}", projectId))
                .doOnError(e -> log.error("Failed to get weighted progress for: {}", projectId, e));
    }

    // ========== Helper Methods ==========

    private String formatRelativeTime(Object timestamp) {
        if (timestamp == null) return "Unknown";
        try {
            java.time.LocalDateTime time = (java.time.LocalDateTime) timestamp;
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            long minutes = java.time.Duration.between(time, now).toMinutes();

            if (minutes < 1) return "Just now";
            if (minutes < 60) return minutes + "분 전";
            if (minutes < 1440) return (minutes / 60) + "시간 전";
            return (minutes / 1440) + "일 전";
        } catch (Exception e) {
            return "Unknown";
        }
    }

    private List<ActivityDto> getDefaultActivities() {
        return List.of(
                ActivityDto.builder()
                        .user("System")
                        .action("No recent activities")
                        .time("N/A")
                        .type("info")
                        .projectId(null)
                        .projectName(null)
                        .build()
        );
    }

    private List<ActivityDto> getDefaultActivitiesForProject(String projectId) {
        return List.of(
                ActivityDto.builder()
                        .user("System")
                        .action("No recent activities in this project")
                        .time("N/A")
                        .type("info")
                        .projectId(projectId)
                        .projectName(null)
                        .build()
        );
    }

    // ========== Activity DTO ==========

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ActivityDto {
        private String user;
        private String action;
        private String time;
        private String type;
        private String projectId;
        private String projectName;
    }
}
