package com.insuretech.pms.decision.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.decision.reactive.entity.R2dbcRisk;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RiskDto {
    private String id;
    private String projectId;
    private String riskCode;
    private String title;
    private String description;
    private String status;
    private String category;
    private Integer impact;
    private Integer probability;
    private Integer score;
    private String severity;
    private String ownerId;
    private String partId;
    private String phaseId;
    private String mitigationPlan;
    private String contingencyPlan;
    private LocalDate dueDate;
    private String etag;
    private String escalatedFromId;
    private String escalatedFromType;
    private String escalatedToId;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> allowedTransitions;

    public static RiskDto from(R2dbcRisk entity) {
        return RiskDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .riskCode(entity.getRiskCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .category(entity.getCategory())
                .impact(entity.getImpact())
                .probability(entity.getProbability())
                .score(entity.getScore())
                .severity(deriveSeverity(entity.getScore()))
                .ownerId(entity.getOwnerId())
                .partId(entity.getPartId())
                .phaseId(entity.getPhaseId())
                .mitigationPlan(entity.getMitigationPlan())
                .contingencyPlan(entity.getContingencyPlan())
                .dueDate(entity.getDueDate())
                .etag(entity.getEtag())
                .escalatedFromId(entity.getEscalatedFromId())
                .escalatedFromType(entity.getEscalatedFromType())
                .escalatedToId(entity.getEscalatedToId())
                .version(entity.getVersion())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static RiskDto fromWithTransitions(R2dbcRisk entity, List<String> transitions) {
        RiskDto dto = from(entity);
        dto.setAllowedTransitions(transitions);
        return dto;
    }

    public static String deriveSeverity(Integer score) {
        if (score == null) return "UNKNOWN";
        if (score >= 16) return "CRITICAL";
        if (score >= 10) return "HIGH";
        if (score >= 5) return "MEDIUM";
        return "LOW";
    }
}
