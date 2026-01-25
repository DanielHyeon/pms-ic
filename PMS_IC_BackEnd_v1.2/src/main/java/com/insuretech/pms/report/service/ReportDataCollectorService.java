package com.insuretech.pms.report.service;

import com.insuretech.pms.report.entity.ReportScope;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * Service for collecting data for report generation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportDataCollectorService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Collect all data needed for report generation
     */
    public Map<String, Object> collectData(
            String projectId,
            ReportScope scope,
            LocalDate periodStart,
            LocalDate periodEnd,
            String userId,
            String teamId,
            String phaseId) {

        Map<String, Object> data = new LinkedHashMap<>();

        // Basic metrics
        data.putAll(collectTaskMetrics(projectId, scope, periodStart, periodEnd, userId, teamId));

        // Completed tasks
        data.put("completed_tasks", collectCompletedTasks(projectId, scope, periodStart, periodEnd, userId, teamId));

        // In-progress tasks
        data.put("in_progress", collectInProgressTasks(projectId, scope, userId, teamId));

        // Planned tasks (next period)
        data.put("tasks_planned", collectPlannedTasks(projectId, scope, userId, teamId));

        // Phase status (if project scope)
        if (scope == ReportScope.PROJECT || scope == ReportScope.PHASE) {
            data.put("phases_status", collectPhaseStatus(projectId, phaseId));
        }

        // Team performance (if project/team scope)
        if (scope == ReportScope.PROJECT || scope == ReportScope.TEAM) {
            data.put("team_performance", collectTeamPerformance(projectId, teamId, periodStart, periodEnd));
        }

        // Issues and blockers
        data.put("issues_active", collectActiveIssues(projectId, scope, userId, teamId));

        // Story points
        data.putAll(collectStoryPointMetrics(projectId, scope, periodStart, periodEnd, userId, teamId));

        return data;
    }

    private Map<String, Object> collectTaskMetrics(
            String projectId, ReportScope scope, LocalDate periodStart, LocalDate periodEnd,
            String userId, String teamId) {

        Map<String, Object> metrics = new HashMap<>();

        String baseQuery = """
            SELECT
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status = 'DONE' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN status = 'TODO' THEN 1 END) as todo_tasks,
                COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END) as blocked_tasks
            FROM task.tasks
            WHERE project_id = ?
            """;

        List<Object> params = new ArrayList<>();
        params.add(projectId);

        if (scope == ReportScope.INDIVIDUAL && userId != null) {
            baseQuery += " AND assignee_id = ?";
            params.add(userId);
        } else if (scope == ReportScope.TEAM && teamId != null) {
            baseQuery += " AND team_id = ?";
            params.add(teamId);
        }

        try {
            Map<String, Object> result = jdbcTemplate.queryForMap(baseQuery, params.toArray());
            metrics.put("totalTasks", result.get("total_tasks"));
            metrics.put("completedTasks", result.get("completed_tasks"));
            metrics.put("inProgressTasks", result.get("in_progress_tasks"));
            metrics.put("todoTasks", result.get("todo_tasks"));
            metrics.put("blockedTasks", result.get("blocked_tasks"));

            // Calculate completion rate
            int total = ((Number) result.getOrDefault("total_tasks", 0)).intValue();
            int completed = ((Number) result.getOrDefault("completed_tasks", 0)).intValue();
            double completionRate = total > 0 ? (double) completed / total * 100 : 0;
            metrics.put("completionRate", Math.round(completionRate * 100.0) / 100.0);

        } catch (Exception e) {
            log.warn("Failed to collect task metrics: {}", e.getMessage());
            metrics.put("totalTasks", 0);
            metrics.put("completedTasks", 0);
            metrics.put("completionRate", 0);
        }

        return metrics;
    }

    private List<Map<String, Object>> collectCompletedTasks(
            String projectId, ReportScope scope, LocalDate periodStart, LocalDate periodEnd,
            String userId, String teamId) {

        String query = """
            SELECT t.id, t.title, t.status, t.completed_at, t.story_points,
                   us.title as story_title
            FROM task.tasks t
            LEFT JOIN task.user_stories us ON t.user_story_id = us.id
            WHERE t.project_id = ?
              AND t.status = 'DONE'
              AND t.completed_at BETWEEN ? AND ?
            """;

        List<Object> params = new ArrayList<>();
        params.add(projectId);
        params.add(periodStart);
        params.add(periodEnd);

        if (scope == ReportScope.INDIVIDUAL && userId != null) {
            query += " AND t.assignee_id = ?";
            params.add(userId);
        } else if (scope == ReportScope.TEAM && teamId != null) {
            query += " AND t.team_id = ?";
            params.add(teamId);
        }

        query += " ORDER BY t.completed_at DESC LIMIT 50";

        try {
            return jdbcTemplate.queryForList(query, params.toArray());
        } catch (Exception e) {
            log.warn("Failed to collect completed tasks: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> collectInProgressTasks(
            String projectId, ReportScope scope, String userId, String teamId) {

        String query = """
            SELECT t.id, t.title, t.status, t.progress, t.due_date,
                   us.title as story_title
            FROM task.tasks t
            LEFT JOIN task.user_stories us ON t.user_story_id = us.id
            WHERE t.project_id = ?
              AND t.status = 'IN_PROGRESS'
            """;

        List<Object> params = new ArrayList<>();
        params.add(projectId);

        if (scope == ReportScope.INDIVIDUAL && userId != null) {
            query += " AND t.assignee_id = ?";
            params.add(userId);
        } else if (scope == ReportScope.TEAM && teamId != null) {
            query += " AND t.team_id = ?";
            params.add(teamId);
        }

        query += " ORDER BY t.due_date ASC LIMIT 50";

        try {
            return jdbcTemplate.queryForList(query, params.toArray());
        } catch (Exception e) {
            log.warn("Failed to collect in-progress tasks: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> collectPlannedTasks(
            String projectId, ReportScope scope, String userId, String teamId) {

        String query = """
            SELECT t.id, t.title, t.priority, t.estimated_hours
            FROM task.tasks t
            WHERE t.project_id = ?
              AND t.status IN ('TODO', 'BACKLOG')
            """;

        List<Object> params = new ArrayList<>();
        params.add(projectId);

        if (scope == ReportScope.INDIVIDUAL && userId != null) {
            query += " AND t.assignee_id = ?";
            params.add(userId);
        } else if (scope == ReportScope.TEAM && teamId != null) {
            query += " AND t.team_id = ?";
            params.add(teamId);
        }

        query += " ORDER BY t.priority DESC, t.created_at ASC LIMIT 20";

        try {
            return jdbcTemplate.queryForList(query, params.toArray());
        } catch (Exception e) {
            log.warn("Failed to collect planned tasks: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> collectPhaseStatus(String projectId, String phaseId) {
        String query = """
            SELECT p.id, p.name, p.status, p.progress,
                   p.planned_start_date, p.planned_end_date,
                   p.actual_start_date, p.actual_end_date
            FROM project.phases p
            WHERE p.project_id = ?
            """;

        List<Object> params = new ArrayList<>();
        params.add(projectId);

        if (phaseId != null) {
            query += " AND p.id = ?";
            params.add(phaseId);
        }

        query += " ORDER BY p.order_num ASC";

        try {
            return jdbcTemplate.queryForList(query, params.toArray());
        } catch (Exception e) {
            log.warn("Failed to collect phase status: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> collectTeamPerformance(
            String projectId, String teamId, LocalDate periodStart, LocalDate periodEnd) {

        // Simplified team performance query
        String query = """
            SELECT
                t.team_id,
                COUNT(CASE WHEN t.status = 'DONE' AND t.completed_at BETWEEN ? AND ? THEN 1 END) as completed_count,
                COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_count,
                COUNT(CASE WHEN t.status = 'BLOCKED' THEN 1 END) as blocked_count,
                COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN t.story_points END), 0) as points_completed
            FROM task.tasks t
            WHERE t.project_id = ?
            """;

        List<Object> params = new ArrayList<>();
        params.add(periodStart);
        params.add(periodEnd);
        params.add(projectId);

        if (teamId != null) {
            query += " AND t.team_id = ?";
            params.add(teamId);
        }

        query += " GROUP BY t.team_id";

        try {
            return jdbcTemplate.queryForList(query, params.toArray());
        } catch (Exception e) {
            log.warn("Failed to collect team performance: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> collectActiveIssues(
            String projectId, ReportScope scope, String userId, String teamId) {

        String query = """
            SELECT i.id, i.title, i.severity, i.status, i.assignee_id, i.created_at
            FROM project.issues i
            WHERE i.project_id = ?
              AND i.status NOT IN ('CLOSED', 'RESOLVED')
            ORDER BY
                CASE i.severity
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    ELSE 4
                END,
                i.created_at DESC
            LIMIT 20
            """;

        try {
            return jdbcTemplate.queryForList(query, projectId);
        } catch (Exception e) {
            log.warn("Failed to collect active issues: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private Map<String, Object> collectStoryPointMetrics(
            String projectId, ReportScope scope, LocalDate periodStart, LocalDate periodEnd,
            String userId, String teamId) {

        Map<String, Object> metrics = new HashMap<>();

        String query = """
            SELECT
                COALESCE(SUM(CASE WHEN status = 'DONE' AND completed_at BETWEEN ? AND ? THEN story_points END), 0) as completed_points,
                COALESCE(SUM(CASE WHEN status IN ('TODO', 'IN_PROGRESS') THEN story_points END), 0) as planned_points
            FROM task.tasks
            WHERE project_id = ?
            """;

        List<Object> params = new ArrayList<>();
        params.add(periodStart);
        params.add(periodEnd);
        params.add(projectId);

        if (scope == ReportScope.INDIVIDUAL && userId != null) {
            query += " AND assignee_id = ?";
            params.add(userId);
        } else if (scope == ReportScope.TEAM && teamId != null) {
            query += " AND team_id = ?";
            params.add(teamId);
        }

        try {
            Map<String, Object> result = jdbcTemplate.queryForMap(query, params.toArray());
            metrics.put("storyPointsCompleted", result.get("completed_points"));
            metrics.put("storyPointsPlanned", result.get("planned_points"));

            // Calculate velocity (points per week)
            long days = java.time.temporal.ChronoUnit.DAYS.between(periodStart, periodEnd);
            int completedPoints = ((Number) result.getOrDefault("completed_points", 0)).intValue();
            double velocity = days > 0 ? (double) completedPoints / days * 7 : 0;
            metrics.put("velocity", Math.round(velocity * 100.0) / 100.0);

        } catch (Exception e) {
            log.warn("Failed to collect story point metrics: {}", e.getMessage());
            metrics.put("storyPointsCompleted", 0);
            metrics.put("storyPointsPlanned", 0);
            metrics.put("velocity", 0);
        }

        return metrics;
    }
}
