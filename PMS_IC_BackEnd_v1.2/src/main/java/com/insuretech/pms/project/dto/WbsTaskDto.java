package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsTask;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class WbsTaskDto {
    private String id;
    private String itemId;
    private String groupId;
    private String phaseId;
    private String code;
    private String name;
    private String description;
    private String status;
    private Integer progress;
    private Integer weight;
    private Integer orderNum;
    private Integer estimatedHours;
    private Integer actualHours;
    private String assigneeId;
    private String linkedTaskId;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualStartDate;
    private LocalDate actualEndDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WbsTaskDto from(R2dbcWbsTask entity) {
        return WbsTaskDto.builder()
                .id(entity.getId())
                .itemId(entity.getItemId())
                .groupId(entity.getGroupId())
                .phaseId(entity.getPhaseId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .progress(entity.getProgress())
                .weight(entity.getWeight())
                .orderNum(entity.getOrderNum())
                .estimatedHours(entity.getEstimatedHours())
                .actualHours(entity.getActualHours())
                .assigneeId(entity.getAssigneeId())
                .linkedTaskId(entity.getLinkedTaskId())
                .plannedStartDate(entity.getPlannedStartDate())
                .plannedEndDate(entity.getPlannedEndDate())
                .actualStartDate(entity.getActualStartDate())
                .actualEndDate(entity.getActualEndDate())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
