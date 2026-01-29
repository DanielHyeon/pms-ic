package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDto {
    private String id;
    private String columnId;
    private String previousColumnId;
    private String phaseId;
    private String title;
    private String description;
    private String assigneeId;
    private String priority;
    private String status;
    private LocalDate dueDate;
    private Integer orderNum;
    private String tags;
    private String sprintId;
    private String userStoryId;
    private String requirementId;
    private String partId;
    private String trackType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
