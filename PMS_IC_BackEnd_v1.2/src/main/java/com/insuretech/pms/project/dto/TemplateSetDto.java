package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.TemplateSet;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TemplateSetDto {
    private String id;
    private String name;
    private String description;
    private String category;
    private String status;
    private String version;
    private Boolean isDefault;
    private String[] tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PhaseTemplateDto> phases;

    public static TemplateSetDto from(TemplateSet entity) {
        return TemplateSetDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .category(entity.getCategory() != null ? entity.getCategory().name() : null)
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .version(entity.getVersion())
                .isDefault(entity.getIsDefault())
                .tags(entity.getTags())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
