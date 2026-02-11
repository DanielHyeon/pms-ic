package com.insuretech.pms.governance.authority.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO representing a node in the delegation map graph.
 * Each node is a user with outgoing delegation edges.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DelegationMapNodeDto {

    private String userId;
    private String userName;
    private String role;
    private List<DelegationEdgeDto> delegations;

    /** 사용자의 유효 권한 목록 (includeEffectiveCapabilities=true 일 때만 포함) */
    private List<EffectiveCapabilityDto> effectiveCapabilities;

    /**
     * Represents a directed edge from the delegator to a delegatee
     * for a specific capability.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DelegationEdgeDto {

        private String delegationId;
        private String delegateeId;
        private String delegateeName;
        private String capabilityCode;
        private String status;
    }
}
