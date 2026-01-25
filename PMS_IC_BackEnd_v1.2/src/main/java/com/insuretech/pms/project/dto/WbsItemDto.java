package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.WbsItem;
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

    public static WbsItemDto from(WbsItem entity) {
        return WbsItemDto.builder()
                .id(entity.getId())
                .groupId(entity.getGroup() != null ? entity.getGroup().getId() : null)
                .phaseId(entity.getPhase() != null ? entity.getPhase().getId() : null)
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
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
