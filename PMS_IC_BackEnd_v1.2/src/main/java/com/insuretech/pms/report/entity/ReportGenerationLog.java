package com.insuretech.pms.report.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Report generation log entity - tracks report generation attempts
 */
@Entity
@Table(name = "report_generation_logs", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportGenerationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", length = 50, nullable = false)
    private String userId;

    @Column(name = "report_id")
    private UUID reportId;

    @Column(name = "project_id", length = 50)
    private String projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_mode", length = 20, nullable = false)
    private GenerationMode generationMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", length = 30)
    private ReportType reportType;

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "status", length = 20, nullable = false)
    private String status; // SUCCESS, FAILED, PARTIAL

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "error_details", columnDefinition = "jsonb")
    private Map<String, Object> errorDetails;

    // Performance metrics
    @Column(name = "data_collection_ms")
    private Integer dataCollectionMs;

    @Column(name = "llm_generation_ms")
    private Integer llmGenerationMs;

    @Column(name = "total_duration_ms")
    private Integer totalDurationMs;

    // Metadata
    @Column(name = "sections_generated", columnDefinition = "TEXT[]")
    private String[] sectionsGenerated;

    @Column(name = "sections_failed", columnDefinition = "TEXT[]")
    private String[] sectionsFailed;

    @Column(name = "llm_model", length = 100)
    private String llmModel;

    @Column(name = "llm_tokens_used")
    private Integer llmTokensUsed;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", insertable = false, updatable = false)
    private Report report;
}
