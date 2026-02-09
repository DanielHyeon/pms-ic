package com.insuretech.pms.governance.authority.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Table(name = "delegations", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDelegation implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("delegator_id")
    private String delegatorId;

    @Column("delegatee_id")
    private String delegateeId;

    @Column("capability_id")
    private String capabilityId;

    @Column("scope_type")
    private String scopeType;

    @Nullable
    @Column("scope_part_id")
    private String scopePartId;

    @Nullable
    @Column("scope_function_desc")
    private String scopeFunctionDesc;

    @Column("duration_type")
    private String durationType;

    @Column("start_at")
    private LocalDate startAt;

    @Nullable
    @Column("end_at")
    private LocalDate endAt;

    @Column("approver_id")
    private String approverId;

    @Nullable
    @Column("approved_at")
    private OffsetDateTime approvedAt;

    @Column("status")
    @Builder.Default
    private String status = "PENDING";

    @Column("created_at")
    private OffsetDateTime createdAt;

    @Column("created_by")
    private String createdBy;

    @Nullable
    @Column("revoked_at")
    private OffsetDateTime revokedAt;

    @Nullable
    @Column("revoked_by")
    private String revokedBy;

    @Nullable
    @Column("revoke_reason")
    private String revokeReason;

    @Nullable
    @Column("parent_delegation_id")
    private String parentDelegationId;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
