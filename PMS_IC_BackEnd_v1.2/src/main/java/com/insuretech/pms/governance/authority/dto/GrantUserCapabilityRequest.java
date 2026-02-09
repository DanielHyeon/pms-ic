package com.insuretech.pms.governance.authority.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for granting a capability directly to a user within a project.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrantUserCapabilityRequest {

    @NotBlank
    private String userId;

    @NotBlank
    private String capabilityId;

    private String reason;
}
