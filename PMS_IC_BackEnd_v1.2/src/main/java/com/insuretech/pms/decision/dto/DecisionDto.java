package com.insuretech.pms.decision.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.decision.reactive.entity.R2dbcDecision;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DecisionDto {
    private String id;
    private String projectId;
    private String decisionCode;
    private String title;
    private String description;
    private String status;
    private String priority;
    private String category;
    private String ownerId;
    private String partId;
    private String phaseId;
    private String optionsJson;
    private String selectedOption;
    private String rationale;
    private LocalDate dueDate;
    private LocalDateTime decidedAt;
    private String decidedBy;
    private String etag;
    private Integer slaHours;
    private String escalatedFromId;
    private String escalatedFromType;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> allowedTransitions;

    public static DecisionDto from(R2dbcDecision entity) {
        return DecisionDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .decisionCode(entity.getDecisionCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .priority(entity.getPriority())
                .category(entity.getCategory())
                .ownerId(entity.getOwnerId())
                .partId(entity.getPartId())
                .phaseId(entity.getPhaseId())
                .optionsJson(entity.getOptionsJson())
                .selectedOption(entity.getSelectedOption())
                .rationale(entity.getRationale())
                .dueDate(entity.getDueDate())
                .decidedAt(entity.getDecidedAt())
                .decidedBy(entity.getDecidedBy())
                .etag(entity.getEtag())
                .slaHours(entity.getSlaHours())
                .escalatedFromId(entity.getEscalatedFromId())
                .escalatedFromType(entity.getEscalatedFromType())
                .version(entity.getVersion())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static DecisionDto fromWithTransitions(R2dbcDecision entity, List<String> transitions) {
        DecisionDto dto = from(entity);
        dto.setAllowedTransitions(transitions);
        return dto;
    }
}
