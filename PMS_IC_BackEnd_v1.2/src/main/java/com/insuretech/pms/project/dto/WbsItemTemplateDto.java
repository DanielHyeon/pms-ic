package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.WbsItemTemplate;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WbsItemTemplateDto {
    private String id;
    private String groupTemplateId;
    private String name;
    private String description;
    private Integer relativeOrder;
    private Integer defaultWeight;
    private Integer estimatedHours;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WbsItemTemplateDto from(WbsItemTemplate entity) {
        return WbsItemTemplateDto.builder()
                .id(entity.getId())
                .groupTemplateId(entity.getGroupTemplate() != null ? entity.getGroupTemplate().getId() : null)
                .name(entity.getName())
                .description(entity.getDescription())
                .relativeOrder(entity.getRelativeOrder())
                .defaultWeight(entity.getDefaultWeight())
                .estimatedHours(entity.getEstimatedHours())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
