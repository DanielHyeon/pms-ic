package com.insuretech.pms.rfp.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 요구사항 근거(Evidence) 추적 DTO.
 * 하나의 요구사항에 대해 소스 문서, AI 추출, 변경 이력, 영향 범위를 포괄한다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceDto {

    private String requirementId;
    private String requirementTitle;
    private String requirementStatus;

    private SourceEvidenceDto sourceEvidence;
    private AiEvidenceDto aiEvidence;
    private List<ChangeEventDto> changeEvidence;
    private ImpactEvidenceDto impactEvidence;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourceEvidenceDto {
        private String rfpTitle;
        private String rfpVersionLabel;
        private String section;
        private String paragraphId;
        private String snippet;
        private String fileUri;
        private String fileChecksum;
        private String integrityStatus; // VERIFIED | MODIFIED | MISSING
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiEvidenceDto {
        private String extractionRunId;
        private String modelName;
        private String modelVersion;
        private String promptVersion;
        private String schemaVersion;
        private BigDecimal confidence;
        private String originalCandidateText;
        private boolean wasEdited;
        private String editedText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChangeEventDto {
        private String id;
        private String changeType; // CREATE | EDIT | DELETE | MERGE | SPLIT
        private String reason;
        private ActorDto changedBy;
        private LocalDateTime changedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActorDto {
        private String id;
        private String name;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImpactEvidenceDto {
        private List<RefDto> impactedEpics;
        private List<RefDto> impactedWbs;
        private List<RefDto> impactedTests;
        private List<RefDto> impactedSprints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefDto {
        private String id;
        private String title;
    }
}
