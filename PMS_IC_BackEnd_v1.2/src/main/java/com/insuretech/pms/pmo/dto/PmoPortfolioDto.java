package com.insuretech.pms.pmo.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PmoPortfolioDto {
    private int totalProjects;
    private int activeProjects;
    private int redProjects;
    private int yellowProjects;
    private int greenProjects;
    private double avgHealthScore;
    private List<ProjectHealthSummary> projects;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectHealthSummary {
        private String projectId;
        private String projectName;
        private String status;
        private String healthGrade;
        private double healthScore;
        private double scheduleScore;
        private double costScore;
        private double qualityScore;
        private double riskScore;
        private double resourceScore;
        private int totalTasks;
        private int completedTasks;
        private double progressPct;
        private int openIssues;
        private int criticalRisks;
    }
}
