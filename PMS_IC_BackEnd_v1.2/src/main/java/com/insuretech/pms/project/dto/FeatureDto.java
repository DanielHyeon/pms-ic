package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcFeature;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FeatureDto {
    private String id;
    private String epicId;
    private String partId;
    private String partName;
    private String wbsGroupId;
    private String name;
    private String description;
    private String status;
    private String priority;
    private Integer orderNum;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FeatureDto from(R2dbcFeature entity) {
        return FeatureDto.builder()
                .id(entity.getId())
                .epicId(entity.getEpicId())
                .partId(entity.getPartId())
                .partName(null) // Part name must be populated separately via join
                .wbsGroupId(entity.getWbsGroupId())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .priority(entity.getPriority())
                .orderNum(entity.getOrderNum())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static FeatureDto from(R2dbcFeature entity, String partName) {
        return FeatureDto.builder()
                .id(entity.getId())
                .epicId(entity.getEpicId())
                .partId(entity.getPartId())
                .partName(partName)
                .wbsGroupId(entity.getWbsGroupId())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .priority(entity.getPriority())
                .orderNum(entity.getOrderNum())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
