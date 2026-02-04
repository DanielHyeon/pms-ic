package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsightDto {
    private String type;        // RISK, ACHIEVEMENT, RECOMMENDATION
    private String severity;    // HIGH, MEDIUM, LOW
    private String title;
    private String description;
    private LocalDateTime generatedAt;
    private String dataSource;
    private InsightEvidence evidence;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsightEvidence {
        private List<String> entityIds;
        private Map<String, Object> metrics;
    }
}
