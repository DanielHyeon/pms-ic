package com.insuretech.pms.rfp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OriginSummaryDto {
    private String originType;
    private String originTypeLabel;
    private OriginPolicyDto.PolicyDto policy;
    private KpiDto kpi;
    private LocalDateTime asOf;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiDto {
        private int activeRfpCount;
        private int totalRequirements;
        private int confirmedRequirements;
        private double epicLinkRate;
        private ChangeImpactDto lastChangeImpact;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChangeImpactDto {
        private String level;
        private int impactedEpics;
        private int impactedTasks;
    }
}
