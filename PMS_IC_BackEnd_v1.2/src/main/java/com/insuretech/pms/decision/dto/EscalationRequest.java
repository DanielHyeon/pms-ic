package com.insuretech.pms.decision.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EscalationRequest {
    @NotBlank
    private String sourceType;
    @NotBlank
    private String sourceId;
    @NotBlank
    private String targetType;
    private String targetId;
    private String reason;
    // If targetId is null, create a new target entity from source data
    private String newTargetTitle;
}
