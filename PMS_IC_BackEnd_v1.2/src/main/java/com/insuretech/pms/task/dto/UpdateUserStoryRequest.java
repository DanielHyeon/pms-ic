package com.insuretech.pms.task.dto;

import com.insuretech.pms.task.reactive.entity.R2dbcUserStory;
import lombok.Data;

import java.util.List;

@Data
public class UpdateUserStoryRequest {

    private String title;

    private String description;

    private R2dbcUserStory.Priority priority;

    private Integer storyPoints;

    private R2dbcUserStory.StoryStatus status;

    private String epic;

    private String assignee;

    private List<String> acceptanceCriteria;

    private String sprintId;
}
