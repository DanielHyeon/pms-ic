package com.insuretech.pms.view.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PmWorkboardView {
    private String projectId;
    @Builder.Default
    private String role = "PM";
    private Set<String> scopedPartIds;
    private Summary summary;
    private SprintView activeSprint;
    private List<BacklogStory> backlogStories;
    private List<Warning> warnings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private long totalStories;
        private long inSprintStories;
        private long backlogStories;
        private String activeSprintName;
        private int sprintVelocity;
        private Map<String, PartWorkload> partWorkload;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartWorkload {
        private int stories;
        private int storyPoints;
        private int members;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SprintView {
        private String id;
        private String name;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private List<SprintStory> stories;
        private int totalPoints;
        private int completedPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SprintStory {
        private String id;
        private String title;
        private String status;
        private Integer storyPoints;
        private String assigneeId;
        private String partName;
        private String epicName;
        private String backlogItemTitle;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BacklogStory {
        private String id;
        private String title;
        private String status;
        private Integer storyPoints;
        private String epicName;
        private String partName;
        private boolean readyForSprint;
        private String blockingReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Warning {
        private String type;
        private String storyId;
        private String message;
    }
}
