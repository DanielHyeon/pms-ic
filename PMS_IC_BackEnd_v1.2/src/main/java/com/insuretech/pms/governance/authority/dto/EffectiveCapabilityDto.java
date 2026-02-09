package com.insuretech.pms.governance.authority.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing an effective (resolved) capability for a user.
 * Sourced from the v_effective_caps database view, which unions
 * role-based, directly-granted, and delegated capabilities.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EffectiveCapabilityDto {

    private String projectId;
    private String userId;
    private String capabilityId;
    private String capabilityCode;
    private String capabilityName;

    /**
     * Indicates how this capability was acquired.
     * Possible values: ROLE, DIRECT, DELEGATION
     */
    private String sourceType;

    /**
     * The ID of the source entity (role_id, user_capability_id, or delegation_id).
     */
    private String sourceId;
}
