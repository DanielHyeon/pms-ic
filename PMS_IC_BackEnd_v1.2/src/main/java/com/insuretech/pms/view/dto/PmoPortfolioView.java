package com.insuretech.pms.view.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PmoPortfolioView {
    private String projectId;
    @Builder.Default
    private String role = "PMO";
    private Summary summary;
    private Kpis kpis;
    private DataQuality dataQuality;
    private List<PartComparison> partComparison;
    private List<Warning> warnings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private double overallProgress;
        private double requirementTraceability;
        private double storyDecompositionRate;
        private double epicCoverage;
        private double dataQualityScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Kpis {
        private List<KpiEntry> coverage;
        private List<KpiEntry> operational;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiEntry {
        private String name;
        private double value;
        private String unit;
        private double threshold;
        private String status;
        private String formula;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataQuality {
        private IntegrityMetrics integrity;
        private ReadinessMetrics readiness;
        private ScoreMetrics score;
        private List<DataIssue> issues;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IntegrityMetrics {
        private int invalidPartReferences;
        private int invalidEpicReferences;
        private int invalidRequirementReferences;
        private int mismatchStoryFeaturePart;
        private int mismatchStoryEpicText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReadinessMetrics {
        private int nullEpicIdStories;
        private int nullPartIdStories;
        private int unlinkedStories;
        private int unlinkedBacklogItems;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreMetrics {
        private int total;
        private int integrityScore;
        private int readinessScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataIssue {
        private String severity;
        private String entity;
        private String issue;
        private String category;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartComparison {
        private String partId;
        private String partName;
        private int stories;
        private int storyPoints;
        private int completedPoints;
        private double completionRate;
        private int memberCount;
        private Double avgLeadTimeDays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Warning {
        private String type;
        private Double value;
        private String message;
    }
}
