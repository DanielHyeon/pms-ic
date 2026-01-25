package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.entity.GenerationMode;
import com.insuretech.pms.report.entity.ReportScope;
import com.insuretech.pms.report.entity.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Request DTO for report generation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportGenerationRequest {

    @NotBlank(message = "Project ID is required")
    private String projectId;

    @NotNull(message = "Report type is required")
    private ReportType reportType;

    @NotNull(message = "Period start is required")
    private LocalDate periodStart;

    @NotNull(message = "Period end is required")
    private LocalDate periodEnd;

    // Scope
    private ReportScope scope;
    private String scopePhaseId;
    private String scopeTeamId;
    private String scopeUserId;

    // Template
    private UUID templateId;

    // Sections to include
    private List<String> sections;

    // Options
    @Builder.Default
    private Boolean useAiSummary = true;

    // Generation mode (set by controller)
    private GenerationMode generationMode;

    // Title override
    private String customTitle;
}
