package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.entity.ReportTemplate;
import com.insuretech.pms.report.entity.ReportType;
import com.insuretech.pms.report.entity.TemplateScope;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private List<TemplateSectionDto> sections;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ReportTemplateDto from(ReportTemplate template) {
        return ReportTemplateDto.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .reportType(template.getReportType())
                .scope(template.getScope())
                .organizationId(template.getOrganizationId())
                .createdBy(template.getCreatedBy())
                .targetRoles(template.getTargetRoles())
                .targetReportScopes(template.getTargetReportScopes())
                .structure(template.getStructure())
                .styling(template.getStyling())
                .isActive(template.getIsActive())
                .isDefault(template.getIsDefault())
                .version(template.getVersion())
                .sections(template.getSections() != null ?
                        template.getSections().stream()
                                .map(TemplateSectionDto::from)
                                .collect(Collectors.toList()) : null)
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
