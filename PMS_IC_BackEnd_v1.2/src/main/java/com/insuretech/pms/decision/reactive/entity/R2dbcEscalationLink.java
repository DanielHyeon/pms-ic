package com.insuretech.pms.decision.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "escalation_links", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEscalationLink {

    @Id
    @Column("id")
    private String id;

    @Column("source_type")
    private String sourceType;

    @Column("source_id")
    private String sourceId;

    @Column("target_type")
    private String targetType;

    @Column("target_id")
    private String targetId;

    @Column("escalated_by")
    private String escalatedBy;

    @Nullable
    @Column("reason")
    private String reason;

    @Column("created_at")
    private LocalDateTime createdAt;
}
