package com.insuretech.pms.governance.accountability.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAccountabilityRequest {

    @NotNull
    private ChangeType changeType;

    private String newUserId;

    @NotBlank
    private String changeReason;

    public enum ChangeType {
        PM_CHANGE,
        CO_PM_CHANGE,
        SPONSOR_CHANGE
    }
}
