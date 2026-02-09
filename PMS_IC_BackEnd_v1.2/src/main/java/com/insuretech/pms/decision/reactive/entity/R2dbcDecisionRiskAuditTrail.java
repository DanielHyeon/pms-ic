package com.insuretech.pms.decision.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "decision_risk_audit_trail", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDecisionRiskAuditTrail {

    @Id
    @Column("id")
    private String id;

    @Column("entity_type")
    private String entityType;

    @Column("entity_id")
    private String entityId;

    @Column("project_id")
    private String projectId;

    @Column("action")
    private String action;

    @Nullable
    @Column("from_status")
    private String fromStatus;

    @Nullable
    @Column("to_status")
    private String toStatus;

    @Column("actor_id")
    private String actorId;

    @Nullable
    @Column("details_json")
    private String detailsJson;

    @Column("created_at")
    private LocalDateTime createdAt;
}
