package com.insuretech.pms.pmo.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PmoHealthDto {
    private String projectId;
    private String projectName;
    private double overallScore;
    private String grade;
    private double scheduleScore;
    private double costScore;
    private double qualityScore;
    private double riskScore;
    private double resourceScore;
    private String trend;
    private LocalDateTime calculatedAt;
    private String calcVersion;
    private List<DimensionDetail> dimensions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DimensionDetail {
        private String dimension;
        private double score;
        private String status;
        private String description;
        private List<String> indicators;
    }
}
