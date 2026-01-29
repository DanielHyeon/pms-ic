package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.reactive.entity.R2dbcReportTemplate;
import com.insuretech.pms.report.enums.ReportType;
import com.insuretech.pms.report.enums.TemplateScope;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for ReportTemplate entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportTemplateDto {

    private UUID id;
    private String name;
    private String description;
    private ReportType reportType;
    private TemplateScope scope;
    private String organizationId;
    private String createdBy;
    private String[] targetRoles;
    private String[] targetReportScopes;
    private Map<String, Object> structure;
    private Map<String, Object> styling;
    private Boolean isActive;
    private Boolean isDefault;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ReportTemplateDto from(R2dbcReportTemplate template) {
        ReportType type = null;
        TemplateScope templateScope = null;
        try {
            if (template.getReportType() != null) type = ReportType.valueOf(template.getReportType());
            if (template.getScope() != null) templateScope = TemplateScope.valueOf(template.getScope());
        } catch (IllegalArgumentException ignored) {}

        return ReportTemplateDto.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .reportType(type)
                .scope(templateScope)
                .organizationId(template.getOrganizationId())
                .createdBy(template.getCreatedBy())
                .targetRoles(template.getTargetRoles())
                .targetReportScopes(template.getTargetReportScopes())
                .isActive(template.getIsActive())
                .isDefault(template.getIsDefault())
                .version(template.getVersion())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
