package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.WbsGroupTemplate;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class WbsGroupTemplateDto {
    private String id;
    private String phaseTemplateId;
    private String name;
    private String description;
    private Integer relativeOrder;
    private Integer defaultWeight;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<WbsItemTemplateDto> wbsItems;

    public static WbsGroupTemplateDto from(WbsGroupTemplate entity) {
        return WbsGroupTemplateDto.builder()
                .id(entity.getId())
                .phaseTemplateId(entity.getPhaseTemplate() != null ? entity.getPhaseTemplate().getId() : null)
                .name(entity.getName())
                .description(entity.getDescription())
                .relativeOrder(entity.getRelativeOrder())
                .defaultWeight(entity.getDefaultWeight())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
