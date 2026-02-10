package com.insuretech.pms.rfp.dto;

import lombok.*;
import java.util.List;

/**
 * RFP 버전 간 요구사항 차이 비교 DTO.
 * 두 extraction run의 candidates를 비교하여 NEW/MODIFIED/REMOVED 항목을 반환한다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiffDto {

    private String fromVersion;
    private String toVersion;
    private List<DiffItem> items;
    private ImpactSummary impactSummary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiffItem {
        private String type; // NEW | MODIFIED | REMOVED
        private String requirementKey;
        private String text;
        private String previousText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImpactSummary {
        private long affectedEpics;
        private long affectedWbs;
        private long affectedSprints;
        private long affectedTests;
    }
}
