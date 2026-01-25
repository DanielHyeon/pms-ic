package com.insuretech.pms.report.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Report entity - stores generated reports
 */
@Entity
@Table(name = "reports", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", length = 50, nullable = false)
    private String projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", length = 30, nullable = false)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_scope", length = 30, nullable = false)
    private ReportScope reportScope;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    // Scope specification
    @Column(name = "scope_phase_id", length = 50)
    private String scopePhaseId;

    @Column(name = "scope_team_id", length = 50)
    private String scopeTeamId;

    @Column(name = "scope_user_id", length = 50)
    private String scopeUserId;

    // Creator role tracking
    @Column(name = "creator_role", length = 30, nullable = false)
    private String creatorRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_mode", length = 20, nullable = false)
    private GenerationMode generationMode;

    @Column(name = "template_id")
    private UUID templateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private ReportStatus status = ReportStatus.DRAFT;

    // JSON content
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metrics_snapshot", columnDefinition = "jsonb")
    private Map<String, Object> metricsSnapshot;

    // LLM metadata
    @Column(name = "llm_generated_sections", columnDefinition = "TEXT[]")
    private String[] llmGeneratedSections;

    @Column(name = "llm_model", length = 100)
    private String llmModel;

    @Column(name = "llm_confidence_score", precision = 3, scale = 2)
    private BigDecimal llmConfidenceScore;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", insertable = false, updatable = false)
    private ReportTemplate template;
}
