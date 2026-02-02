package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.enums.GenerationMode;
import com.insuretech.pms.report.enums.ReportScope;
import com.insuretech.pms.report.enums.ReportStatus;
import com.insuretech.pms.report.enums.ReportType;
import com.insuretech.pms.report.reactive.entity.R2dbcReport;
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

    public static ReportDto from(R2dbcReport report) {
        ReportType type = null;
        ReportScope scope = null;
        ReportStatus stat = null;
        GenerationMode mode = null;
        try {
            if (report.getReportType() != null) type = ReportType.valueOf(report.getReportType());
            if (report.getReportScope() != null) scope = ReportScope.valueOf(report.getReportScope());
            if (report.getStatus() != null) stat = ReportStatus.valueOf(report.getStatus());
            if (report.getGenerationMode() != null) mode = GenerationMode.valueOf(report.getGenerationMode());
        } catch (IllegalArgumentException ignored) {}

        return ReportDto.builder()
                .id(report.getId())
                .projectId(report.getProjectId())
                .reportType(type)
                .reportScope(scope)
                .title(report.getTitle())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .scopePhaseId(report.getScopePhaseId())
                .scopeTeamId(report.getScopeTeamId())
                .scopeUserId(report.getScopeUserId())
                .createdBy(report.getCreatedBy())
                .creatorRole(report.getCreatorRole())
                .generationMode(mode)
                .templateId(report.getTemplateId())
                .status(stat)
                .llmGeneratedSections(report.getLlmGeneratedSections())
                .llmModel(report.getLlmModel())
                .llmConfidenceScore(report.getLlmConfidenceScore())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .publishedAt(report.getPublishedAt())
                .build();
    }
}
