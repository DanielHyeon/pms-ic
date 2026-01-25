package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.entity.ReportScope;
import lombok.*;

import java.util.List;

/**
 * DTO for report generation options based on user role
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportOptionsDto {

    private String role;

    // Available scopes
    private ReportScope defaultScope;
    private List<ReportScope> availableScopes;
    private Boolean canChangeScope;

    // Available sections
    private List<String> defaultSections;
    private List<SectionOption> availableSections;
    private Boolean canSelectSections;

    // Period constraints
    private Integer maxPeriodDays;
    private Boolean canExtendPeriod;

    // Templates
    private List<TemplateOption> availableTemplates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionOption {
        private String key;
        private String label;
        private String description;
        private Boolean isDefault;
        private Boolean isRequired;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateOption {
        private String id;
        private String name;
        private String description;
        private Boolean isDefault;
    }
}
