package com.insuretech.pms.report.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Table(name = "reports", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcReport extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private UUID id;

    @Column("project_id")
    private String projectId;

    @Column("report_type")
    private String reportType;

    @Column("report_scope")
    private String reportScope;

    @Nullable
    @Column("title")
    private String title;

    @Column("period_start")
    private LocalDate periodStart;

    @Column("period_end")
    private LocalDate periodEnd;

    @Nullable
    @Column("scope_phase_id")
    private String scopePhaseId;

    @Nullable
    @Column("scope_team_id")
    private String scopeTeamId;

    @Nullable
    @Column("scope_user_id")
    private String scopeUserId;

    @Column("creator_role")
    private String creatorRole;

    @Column("generation_mode")
    private String generationMode;

    @Nullable
    @Column("template_id")
    private UUID templateId;

    @Column("status")
    @Builder.Default
    private String status = "DRAFT";

    // JSON content stored as String - parsed in service layer
    @Column("content")
    private String content;

    @Nullable
    @Column("metrics_snapshot")
    private String metricsSnapshot;

    @Nullable
    @Column("llm_generated_sections")
    private String[] llmGeneratedSections;

    @Nullable
    @Column("llm_model")
    private String llmModel;

    @Nullable
    @Column("llm_confidence_score")
    private BigDecimal llmConfidenceScore;

    @Nullable
    @Column("published_at")
    private LocalDateTime publishedAt;
}
