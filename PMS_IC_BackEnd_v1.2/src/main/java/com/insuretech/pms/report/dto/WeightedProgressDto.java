package com.insuretech.pms.report.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO for weighted progress calculation across AI/SI/Common tracks.
 * Used in Statistics dashboard for displaying integrated progress metrics.
 */
@Data
@Builder
public class WeightedProgressDto {

    // Individual track progress rates (0-100)
    private Double aiProgress;
    private Double siProgress;
    private Double commonProgress;

    // Final weighted progress rate (0-100)
    private Double weightedProgress;

    // Track weights (0.00-1.00)
    private BigDecimal aiWeight;
    private BigDecimal siWeight;
    private BigDecimal commonWeight; // Calculated as 1 - aiWeight - siWeight

    // Task counts by track type
    private Long aiTotalTasks;
    private Long aiCompletedTasks;
    private Long siTotalTasks;
    private Long siCompletedTasks;
    private Long commonTotalTasks;
    private Long commonCompletedTasks;

    // Overall totals
    private Long totalTasks;
    private Long completedTasks;
}
