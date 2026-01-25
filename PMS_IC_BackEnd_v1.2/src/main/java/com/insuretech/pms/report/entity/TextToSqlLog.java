package com.insuretech.pms.report.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * TextToSQL log entity - tracks natural language to SQL conversion attempts
 */
@Entity
@Table(name = "text_to_sql_logs", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TextToSqlLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", length = 50, nullable = false)
    private String userId;

    @Column(name = "project_id", length = 50)
    private String projectId;

    @Column(name = "user_role", length = 30)
    private String userRole;

    // Input/Output
    @Column(name = "natural_language_query", columnDefinition = "TEXT", nullable = false)
    private String naturalLanguageQuery;

    @Column(name = "generated_sql", columnDefinition = "TEXT")
    private String generatedSql;

    @Column(name = "sql_explanation", columnDefinition = "TEXT")
    private String sqlExplanation;

    // Execution result
    @Column(name = "execution_status", length = 20)
    private String executionStatus; // SUCCESS, FAILED, REJECTED

    @Column(name = "result_count")
    private Integer resultCount;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // Security
    @Column(name = "was_sanitized")
    @Builder.Default
    private Boolean wasSanitized = false;

    @Column(name = "sanitization_notes", columnDefinition = "TEXT")
    private String sanitizationNotes;

    @Column(name = "blocked_patterns", columnDefinition = "TEXT[]")
    private String[] blockedPatterns;

    // Performance
    @Column(name = "generation_ms")
    private Integer generationMs;

    @Column(name = "execution_ms")
    private Integer executionMs;

    // LLM metadata
    @Column(name = "llm_model", length = 100)
    private String llmModel;

    @Column(name = "llm_confidence", precision = 3, scale = 2)
    private BigDecimal llmConfidence;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
