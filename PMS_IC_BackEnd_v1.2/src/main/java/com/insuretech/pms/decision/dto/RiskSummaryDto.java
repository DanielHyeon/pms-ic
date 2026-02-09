package com.insuretech.pms.decision.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.decision.reactive.entity.R2dbcRisk;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RiskSummaryDto {
    private String id;
    private String riskCode;
    private String title;
    private String status;
    private String category;
    private Integer impact;
    private Integer probability;
    private Integer score;
    private String severity;
    private String ownerId;
    private LocalDate dueDate;
    private LocalDateTime createdAt;

    public static RiskSummaryDto from(R2dbcRisk entity) {
        return RiskSummaryDto.builder()
                .id(entity.getId())
                .riskCode(entity.getRiskCode())
                .title(entity.getTitle())
                .status(entity.getStatus())
                .category(entity.getCategory())
                .impact(entity.getImpact())
                .probability(entity.getProbability())
                .score(entity.getScore())
                .severity(RiskDto.deriveSeverity(entity.getScore()))
                .ownerId(entity.getOwnerId())
                .dueDate(entity.getDueDate())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
