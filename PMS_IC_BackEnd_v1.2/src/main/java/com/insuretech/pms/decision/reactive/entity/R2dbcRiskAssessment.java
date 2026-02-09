package com.insuretech.pms.decision.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.ReadOnlyProperty;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Table(name = "risk_assessments", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRiskAssessment {

    @Id
    @Column("id")
    private String id;

    @Column("risk_id")
    private String riskId;

    @Column("assessed_by")
    private String assessedBy;

    @Column("impact")
    private Integer impact;

    @Column("probability")
    private Integer probability;

    @ReadOnlyProperty
    @Column("score")
    private Integer score;

    @Nullable
    @Column("justification")
    private String justification;

    @Column("ai_assisted")
    @Builder.Default
    private Boolean aiAssisted = false;

    @Nullable
    @Column("ai_confidence")
    private BigDecimal aiConfidence;

    @Column("assessment_source")
    @Builder.Default
    private String assessmentSource = "MANUAL";

    @Column("created_at")
    private LocalDateTime createdAt;
}
