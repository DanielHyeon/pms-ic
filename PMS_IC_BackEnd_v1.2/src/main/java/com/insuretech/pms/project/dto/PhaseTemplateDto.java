package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.PhaseTemplate;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PhaseTemplateDto {
    private String id;
    private String templateSetId;
    private String name;
    private String description;
    private Integer relativeOrder;
    private Integer defaultDurationDays;
    private String color;
    private String trackType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<WbsGroupTemplateDto> wbsGroups;

    public static PhaseTemplateDto from(PhaseTemplate entity) {
        return PhaseTemplateDto.builder()
                .id(entity.getId())
                .templateSetId(entity.getTemplateSet() != null ? entity.getTemplateSet().getId() : null)
                .name(entity.getName())
                .description(entity.getDescription())
                .relativeOrder(entity.getRelativeOrder())
                .defaultDurationDays(entity.getDefaultDurationDays())
                .color(entity.getColor())
                .trackType(entity.getTrackType() != null ? entity.getTrackType().name() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
