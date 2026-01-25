package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.entity.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for Report entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportDto {

    private UUID id;
    private String projectId;
    private ReportType reportType;
    private ReportScope reportScope;
    private String title;
    private LocalDate periodStart;
    private LocalDate periodEnd;

    // Scope
    private String scopePhaseId;
    private String scopeTeamId;
    private String scopeUserId;

    // Creation info
    private String createdBy;
    private String creatorRole;
    private GenerationMode generationMode;
    private UUID templateId;
    private String templateName;

    // Status
    private ReportStatus status;

    // Content
    private Map<String, Object> content;
    private Map<String, Object> metricsSnapshot;

    // LLM metadata
    private String[] llmGeneratedSections;
    private String llmModel;
    private BigDecimal llmConfidenceScore;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime publishedAt;

    public static ReportDto from(Report report) {
        return ReportDto.builder()
                .id(report.getId())
                .projectId(report.getProjectId())
                .reportType(report.getReportType())
                .reportScope(report.getReportScope())
                .title(report.getTitle())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .scopePhaseId(report.getScopePhaseId())
                .scopeTeamId(report.getScopeTeamId())
                .scopeUserId(report.getScopeUserId())
                .createdBy(report.getCreatedBy())
                .creatorRole(report.getCreatorRole())
                .generationMode(report.getGenerationMode())
                .templateId(report.getTemplateId())
                .templateName(report.getTemplate() != null ? report.getTemplate().getName() : null)
                .status(report.getStatus())
                .content(report.getContent())
                .metricsSnapshot(report.getMetricsSnapshot())
                .llmGeneratedSections(report.getLlmGeneratedSections())
                .llmModel(report.getLlmModel())
                .llmConfidenceScore(report.getLlmConfidenceScore())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .publishedAt(report.getPublishedAt())
                .build();
    }
}
