package com.insuretech.pms.governance.authority.dto;

import com.insuretech.pms.governance.authority.entity.R2dbcDelegation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * DTO representing a capability delegation from one user to another.
 * Name fields (delegatorName, delegateeName, capabilityCode, capabilityName,
 * scopePartName, approverName) are enriched after construction.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DelegationDto {

    private String id;
    private String projectId;

    private String delegatorId;
    private String delegatorName;
    private String delegateeId;
    private String delegateeName;

    private String capabilityId;
    private String capabilityCode;
    private String capabilityName;

    private String scopeType;
    private String scopePartId;
    private String scopePartName;
    private String scopeFunctionDesc;

    private String durationType;
    private LocalDate startAt;
    private LocalDate endAt;

    private String approverId;
    private String approverName;
    private OffsetDateTime approvedAt;

    private String status;
    private OffsetDateTime createdAt;
    private String createdBy;

    private OffsetDateTime revokedAt;
    private String revokedBy;
    private String revokeReason;

    private String parentDelegationId;

    /** 위임 생성 시 SoD 사전 검증에서 발견된 경고 목록 */
    private List<SodWarningDto> sodWarnings;

    /**
     * Factory method to create a DelegationDto from an R2dbcDelegation entity.
     * Name fields (delegatorName, delegateeName, capabilityCode, capabilityName,
     * scopePartName, approverName) are not populated here; they must be enriched separately.
     */
    public static DelegationDto from(R2dbcDelegation entity) {
        return DelegationDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .delegatorId(entity.getDelegatorId())
                .delegateeId(entity.getDelegateeId())
                .capabilityId(entity.getCapabilityId())
                .scopeType(entity.getScopeType())
                .scopePartId(entity.getScopePartId())
                .scopeFunctionDesc(entity.getScopeFunctionDesc())
                .durationType(entity.getDurationType())
                .startAt(entity.getStartAt())
                .endAt(entity.getEndAt())
                .approverId(entity.getApproverId())
                .approvedAt(entity.getApprovedAt())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .revokedAt(entity.getRevokedAt())
                .revokedBy(entity.getRevokedBy())
                .revokeReason(entity.getRevokeReason())
                .parentDelegationId(entity.getParentDelegationId())
                .build();
    }
}
