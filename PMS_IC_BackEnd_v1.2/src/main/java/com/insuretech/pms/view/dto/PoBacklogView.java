package com.insuretech.pms.view.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoBacklogView {
    private String projectId;
    @Builder.Default
    private String role = "PO";
    private Summary summary;
    private List<BacklogItemView> backlogItems;
    private List<EpicSummary> epics;
    private List<StoryRef> unlinkedStories;
    private List<Warning> warnings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private long totalBacklogItems;
        private long approvedItems;
        private long pendingItems;
        private double requirementCoverage;
        private long epicCount;
        private double storyDecompositionRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BacklogItemView {
        private String id;
        private String requirementTitle;
        private String requirementPriority;
        private String status;
        private String epicName;
        private List<StoryRef> stories;
        private int storyCount;
        private int completedStoryCount;
        private int totalStoryPoints;
        private int completedStoryPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EpicSummary {
        private String id;
        private String name;
        private int progress;
        private int backlogItemCount;
        private int storyCount;
        private double completedStoryRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoryRef {
        private String id;
        private String title;
        private String status;
        private Integer storyPoints;
        private String sprintName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Warning {
        private String type;
        private String entityId;
        private String message;
    }
}
