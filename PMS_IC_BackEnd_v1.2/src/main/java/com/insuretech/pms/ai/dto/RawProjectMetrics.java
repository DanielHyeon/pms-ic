package com.insuretech.pms.ai.dto;

import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Internal DTO holding aggregated project metrics from PostgreSQL.
 * Not exposed via API -- used by rule engine.
 */
@Builder
public record RawProjectMetrics(
        List<OverdueTask> overdueTasks,
        SprintProgress sprintProgress,
        List<AssigneeWorkload> assigneeWorkload,
        List<OpenIssue> openIssues,
        RecentActivity recentActivity
) {

    @Builder
    public record OverdueTask(
            String id,
            String title,
            String assigneeId,
            String assigneeName,
            OffsetDateTime dueDate,
            int delayDays
    ) {}

    @Builder
    public record SprintProgress(
            String sprintId,
            String sprintName,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            int completed,
            int total,
            double progressPct
    ) {}

    @Builder
    public record AssigneeWorkload(
            String assigneeId,
            String assigneeName,
            int activeTasks
    ) {}

    @Builder
    public record OpenIssue(
            String id,
            String title,
            String severity,
            String status,
            OffsetDateTime createdAt
    ) {}

    @Builder
    public record RecentActivity(
            int totalActivities,
            OffsetDateTime lastActivity
    ) {}
}
