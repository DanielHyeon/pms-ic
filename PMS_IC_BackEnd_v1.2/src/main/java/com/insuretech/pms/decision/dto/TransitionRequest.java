package com.insuretech.pms.decision.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransitionRequest {
    @NotBlank
    private String targetStatus;
    private String comment;
}
