package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsItem;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class WbsItemDto {
    private String id;
    private String groupId;
    private String phaseId;
    private String code;
    private String name;
    private String description;
    private String status;
    private Integer progress;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualStartDate;
    private LocalDate actualEndDate;
    private Integer weight;
    private Integer orderNum;
    private Integer estimatedHours;
    private Integer actualHours;
    private String assigneeId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WbsItemDto from(R2dbcWbsItem entity) {
        return WbsItemDto.builder()
                .id(entity.getId())
                .groupId(entity.getGroupId())
                .phaseId(entity.getPhaseId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .progress(entity.getProgress())
                .plannedStartDate(entity.getPlannedStartDate())
                .plannedEndDate(entity.getPlannedEndDate())
                .actualStartDate(entity.getActualStartDate())
                .actualEndDate(entity.getActualEndDate())
                .weight(entity.getWeight())
                .orderNum(entity.getOrderNum())
                .estimatedHours(entity.getEstimatedHours())
                .actualHours(entity.getActualHours())
                .assigneeId(entity.getAssigneeId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
