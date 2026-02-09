package com.insuretech.pms.governance.authority.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request payload for creating a new capability delegation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDelegationRequest {

    @NotBlank
    private String delegateeId;

    @NotBlank
    private String capabilityId;

    @NotNull
    private ScopeType scopeType;

    private String scopePartId;

    private String scopeFunctionDesc;

    @NotNull
    private DurationType durationType;

    private LocalDate startAt;

    private LocalDate endAt;

    @NotBlank
    private String approverId;

    /**
     * Defines the scope boundary of a delegation.
     */
    public enum ScopeType {
        PROJECT,
        PART,
        FUNCTION
    }

    /**
     * Defines whether a delegation is permanent or time-bounded.
     */
    public enum DurationType {
        PERMANENT,
        TEMPORARY
    }
}
