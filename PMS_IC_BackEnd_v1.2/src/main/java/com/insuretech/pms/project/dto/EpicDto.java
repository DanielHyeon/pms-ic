package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcEpic;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class EpicDto {
    private String id;
    private String projectId;
    private String name;
    private String description;
    private String status;
    private String goal;
    private String ownerId;
    private LocalDate targetCompletionDate;
    private Integer businessValue;
    private Integer totalStoryPoints;
    private Integer itemCount;
    private String phaseId;
    private String color;
    private Integer progress;
    private String priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EpicDto from(R2dbcEpic entity) {
        return EpicDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .goal(entity.getGoal())
                .ownerId(entity.getOwnerId())
                .targetCompletionDate(entity.getTargetCompletionDate())
                .businessValue(entity.getBusinessValue())
                .totalStoryPoints(entity.getTotalStoryPoints())
                .itemCount(entity.getItemCount())
                .phaseId(entity.getPhaseId())
                .color(entity.getColor())
                .progress(entity.getProgress())
                .priority(entity.getPriority())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
