package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.entity.SectionType;
import com.insuretech.pms.report.entity.TemplateSection;
import lombok.*;

import java.util.Map;
import java.util.UUID;

/**
 * DTO for TemplateSection entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateSectionDto {

    private UUID id;
    private String sectionKey;
    private String title;
    private SectionType sectionType;
    private Map<String, Object> config;
    private Boolean isRequired;
    private Integer displayOrder;

    public static TemplateSectionDto from(TemplateSection section) {
        return TemplateSectionDto.builder()
                .id(section.getId())
                .sectionKey(section.getSectionKey())
                .title(section.getTitle())
                .sectionType(section.getSectionType())
                .config(section.getConfig())
                .isRequired(section.getIsRequired())
                .displayOrder(section.getDisplayOrder())
                .build();
    }
}
