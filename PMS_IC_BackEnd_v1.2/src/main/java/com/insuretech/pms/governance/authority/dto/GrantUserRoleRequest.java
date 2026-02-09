package com.insuretech.pms.governance.authority.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for granting a role to a user within a project.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrantUserRoleRequest {

    @NotBlank
    private String userId;

    @NotBlank
    private String roleId;

    private String reason;
}
