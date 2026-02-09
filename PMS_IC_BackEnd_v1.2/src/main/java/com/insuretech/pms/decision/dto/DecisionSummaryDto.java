package com.insuretech.pms.decision.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.decision.reactive.entity.R2dbcDecision;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DecisionSummaryDto {
    private String id;
    private String decisionCode;
    private String title;
    private String status;
    private String priority;
    private String category;
    private String ownerId;
    private LocalDate dueDate;
    private LocalDateTime createdAt;

    public static DecisionSummaryDto from(R2dbcDecision entity) {
        return DecisionSummaryDto.builder()
                .id(entity.getId())
                .decisionCode(entity.getDecisionCode())
                .title(entity.getTitle())
                .status(entity.getStatus())
                .priority(entity.getPriority())
                .category(entity.getCategory())
                .ownerId(entity.getOwnerId())
                .dueDate(entity.getDueDate())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
