package com.insuretech.pms.task.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.insuretech.pms.task.reactive.entity.R2dbcUserStory;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class UserStoryResponse {

    private String id;

    private String projectId;

    private String sprintId;

    private String title;

    private String description;

    private String acceptanceCriteria;

    private String priority;

    private Integer storyPoints;

    private String status;

    private String assigneeId;

    private String epic;

    private String epicId;

    private String featureId;

    private String wbsItemId;

    private String partId;

    private List<String> acceptanceCriteriaList;

    private Integer priorityOrder;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    public static UserStoryResponse fromEntity(R2dbcUserStory story, List<String> acceptanceCriteriaList) {
        return UserStoryResponse.builder()
                .id(story.getId())
                .projectId(story.getProjectId())
                .sprintId(story.getSprintId())
                .title(story.getTitle())
                .description(story.getDescription())
                .acceptanceCriteria(story.getAcceptanceCriteria())
                .priority(story.getPriority())
                .storyPoints(story.getStoryPoints())
                .status(story.getStatus())
                .assigneeId(story.getAssigneeId())
                .epic(story.getEpic())
                .epicId(story.getEpicId())
                .featureId(story.getFeatureId())
                .wbsItemId(story.getWbsItemId())
                .partId(story.getPartId())
                .acceptanceCriteriaList(acceptanceCriteriaList)
                .priorityOrder(story.getPriorityOrder())
                .createdAt(story.getCreatedAt())
                .updatedAt(story.getUpdatedAt())
                .build();
    }
}
