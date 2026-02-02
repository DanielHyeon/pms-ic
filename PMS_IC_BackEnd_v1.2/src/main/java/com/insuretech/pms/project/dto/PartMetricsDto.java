package com.insuretech.pms.project.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * Part Metrics DTO for detailed metrics view.
 * Used for Part-level reporting and analytics.
 */
@Data
@Builder
public class PartMetricsDto {

    private String partId;
    private String partName;

    // Story Point metrics
    private Integer totalStoryPoints;
    private Integer completedStoryPoints;
    private Integer inProgressStoryPoints;
    private Integer plannedStoryPoints;

    // Completion rates
    private Double storyPointCompletionRate;
    private Double storyCountCompletionRate;
    private Double taskCompletionRate;

    // Velocity (if sprint data available)
    private Double averageVelocity;
    private Integer lastSprintVelocity;

    // Work in Progress
    private Integer wipCount;
    private Integer wipLimit;

    // Blockers and Risks
    private Integer blockedItems;
    private Integer overdueItems;
    private Integer atRiskItems;

    // Time metrics
    private Double averageCycleTime;
    private Double averageLeadTime;

    // Period info
    private LocalDate periodStart;
    private LocalDate periodEnd;
}
