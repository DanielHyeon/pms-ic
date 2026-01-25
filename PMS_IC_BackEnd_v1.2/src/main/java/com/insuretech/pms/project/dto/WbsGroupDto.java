package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.WbsGroup;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class WbsGroupDto {
    private String id;
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
    private String linkedEpicId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WbsGroupDto from(WbsGroup entity) {
        return WbsGroupDto.builder()
                .id(entity.getId())
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
                .linkedEpicId(entity.getLinkedEpicId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
