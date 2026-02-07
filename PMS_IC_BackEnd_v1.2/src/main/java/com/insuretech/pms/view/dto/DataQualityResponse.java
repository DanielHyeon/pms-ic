package com.insuretech.pms.view.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Data Quality API response: 3-tier scoring (Integrity/Readiness/Traceability),
 * 10 metrics, issues with suggested actions, and historical trend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataQualityResponse {

    private String projectId;
    private LocalDateTime timestamp;
    private double overallScore;
    private String grade;
    private Map<String, CategoryScore> categories;
    private List<DataIssue> issues;
    private List<HistoryEntry> history;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryScore {
        private double score;
        private double weight;
        private List<Metric> metrics;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Metric {
        private String id;
        private String name;
        private double value;
        private double target;
        private String unit;
        private String status;  // OK, WARNING, DANGER
        private long numerator;
        private long denominator;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataIssue {
        private String severity;    // DANGER, WARNING
        private String category;    // integrity, readiness, traceability
        private String metric;
        private String description;
        private List<String> affectedEntities;
        private String suggestedAction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryEntry {
        private String date;
        private double score;
        private double integrity;
        private double readiness;
        private double traceability;
    }
}
