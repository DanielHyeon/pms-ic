package com.insuretech.pms.rfp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.rfp.reactive.entity.R2dbcOriginPolicy;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OriginPolicyDto {
    private String id;
    private String projectId;
    private String originType;
    private String originTypeLabel;
    private PolicyDto policy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PolicyDto {
        private Boolean requireSourceRfpId;
        private String evidenceLevel;
        private Boolean changeApprovalRequired;
        private Boolean autoAnalysisEnabled;
        private String lineageEnforcement;
    }

    public static OriginPolicyDto from(R2dbcOriginPolicy entity) {
        return OriginPolicyDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .originType(entity.getOriginType())
                .originTypeLabel(resolveLabel(entity.getOriginType()))
                .policy(PolicyDto.builder()
                        .requireSourceRfpId(entity.getRequireSourceRfpId())
                        .evidenceLevel(entity.getEvidenceLevel())
                        .changeApprovalRequired(entity.getChangeApprovalRequired())
                        .autoAnalysisEnabled(entity.getAutoAnalysisEnabled())
                        .lineageEnforcement(entity.getLineageEnforcement())
                        .build())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String resolveLabel(String originType) {
        if (originType == null) return null;
        return switch (originType) {
            case "EXTERNAL_RFP" -> "외부 고객 RFP 기반";
            case "INTERNAL_INITIATIVE" -> "내부 기획 프로젝트";
            case "MODERNIZATION" -> "기존 시스템 고도화";
            case "MIXED" -> "혼합 (외부 RFP + 내부 요구사항)";
            default -> originType;
        };
    }
}
