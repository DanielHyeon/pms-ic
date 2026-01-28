package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.Feature;
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

    public static FeatureDto from(Feature entity) {
        return FeatureDto.builder()
                .id(entity.getId())
                .epicId(entity.getEpic() != null ? entity.getEpic().getId() : null)
                .partId(entity.getPart() != null ? entity.getPart().getId() : null)
                .partName(entity.getPart() != null ? entity.getPart().getName() : null)
                .wbsGroupId(entity.getWbsGroupId())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .priority(entity.getPriority() != null ? entity.getPriority().name() : null)
                .orderNum(entity.getOrderNum())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
