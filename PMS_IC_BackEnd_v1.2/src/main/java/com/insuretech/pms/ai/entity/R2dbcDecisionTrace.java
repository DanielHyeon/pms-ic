package com.insuretech.pms.ai.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Table(name = "decision_trace_log", schema = "ai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDecisionTrace implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("user_id")
    private String userId;

    @Column("user_role")
    private String userRole;

    @Column("event_type")
    private String eventType;

    @Column("briefing_id")
    private String briefingId;

    @Nullable
    @Column("insight_id")
    private String insightId;

    @Nullable
    @Column("insight_type")
    private String insightType;

    @Nullable
    @Column("severity")
    private String severity;

    @Nullable
    @Column("confidence")
    private BigDecimal confidence;

    @Nullable
    @Column("action_id")
    private String actionId;

    @Nullable
    @Column("action_result")
    private String actionResult;

    @Nullable
    @Column("generation_method")
    private String generationMethod;

    @Nullable
    @Column("completeness")
    private String completeness;

    @Nullable
    @Column("data_sources")
    private String dataSources;

    @Nullable
    @Column("evidence_json")
    private String evidenceJson;

    @Nullable
    @Column("as_of")
    private OffsetDateTime asOf;

    @Column("generated_at")
    private OffsetDateTime generatedAt;

    @Nullable
    @Column("action_clicked_at")
    private OffsetDateTime actionClickedAt;

    @Nullable
    @Column("action_completed_at")
    private OffsetDateTime actionCompletedAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
