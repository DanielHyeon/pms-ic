package com.insuretech.pms.decision.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.ReadOnlyProperty;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "risks", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRisk extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("risk_code")
    private String riskCode;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Column("status")
    @Builder.Default
    private String status = "IDENTIFIED";

    @Nullable
    @Column("category")
    private String category;

    @Column("impact")
    @Builder.Default
    private Integer impact = 3;

    @Column("probability")
    @Builder.Default
    private Integer probability = 3;

    @ReadOnlyProperty
    @Column("score")
    private Integer score;

    @Column("owner_id")
    private String ownerId;

    @Nullable
    @Column("part_id")
    private String partId;

    @Nullable
    @Column("phase_id")
    private String phaseId;

    @Nullable
    @Column("mitigation_plan")
    private String mitigationPlan;

    @Nullable
    @Column("contingency_plan")
    private String contingencyPlan;

    @Nullable
    @Column("due_date")
    private LocalDate dueDate;

    @Column("etag")
    private String etag;

    @Nullable
    @Column("escalated_from_id")
    private String escalatedFromId;

    @Nullable
    @Column("escalated_from_type")
    private String escalatedFromType;

    @Nullable
    @Column("escalated_to_id")
    private String escalatedToId;

    @Column("version")
    @Builder.Default
    private Integer version = 1;

    public enum Status {
        IDENTIFIED, ASSESSED, MITIGATING, RESOLVED, ACCEPTED
    }

    public enum Category {
        TECHNICAL, SCHEDULE, COST, RESOURCE, EXTERNAL, SCOPE, QUALITY
    }
}
