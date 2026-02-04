package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {
    // View mode indicators
    private Boolean isPortfolioView;
    private String projectId;
    private String projectName;

    // Project Statistics
    private Long totalProjects;
    private Long activeProjects;
    private Map<String, Long> projectsByStatus;

    // Task Statistics
    private Long totalTasks;
    private Long completedTasks;
    private Long inProgressTasks;
    private Integer avgProgress;
    private Map<String, Long> tasksByStatus;

    // Issue Statistics
    private Long totalIssues;
    private Long openIssues;
    private Long highPriorityIssues;

    // Budget Statistics
    private java.math.BigDecimal budgetTotal;
    private java.math.BigDecimal budgetSpent;
    private Integer budgetExecutionRate;
}