package com.insuretech.pms.decision.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.decision.reactive.entity.R2dbcRiskAssessment;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RiskAssessmentDto {
    private String id;
    private String riskId;
    private String assessedBy;
    private Integer impact;
    private Integer probability;
    private Integer score;
    private String severity;
    private String justification;
    private Boolean aiAssisted;
    private BigDecimal aiConfidence;
    private String assessmentSource;
    private LocalDateTime createdAt;

    public static RiskAssessmentDto from(R2dbcRiskAssessment entity) {
        return RiskAssessmentDto.builder()
                .id(entity.getId())
                .riskId(entity.getRiskId())
                .assessedBy(entity.getAssessedBy())
                .impact(entity.getImpact())
                .probability(entity.getProbability())
                .score(entity.getScore())
                .severity(RiskDto.deriveSeverity(entity.getScore()))
                .justification(entity.getJustification())
                .aiAssisted(entity.getAiAssisted())
                .aiConfidence(entity.getAiConfidence())
                .assessmentSource(entity.getAssessmentSource())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
