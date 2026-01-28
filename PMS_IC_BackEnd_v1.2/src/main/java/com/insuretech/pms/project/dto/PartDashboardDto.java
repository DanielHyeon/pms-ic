package com.insuretech.pms.project.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Part Dashboard DTO for PL (Part Leader) Cockpit view.
 * Contains aggregated metrics and status for a Part (Work Area).
 */
@Data
@Builder
public class PartDashboardDto {

    private String partId;
    private String partName;
    private String projectId;

    // Part Leader info
    private String plUserId;
    private String plName;

    // Progress metrics
    private Integer totalStoryPoints;
    private Integer completedStoryPoints;
    private Integer inProgressStoryPoints;
    private Double completionRate;

    // Story counts
    private Integer totalStories;
    private Integer completedStories;
    private Integer inProgressStories;
    private Integer readyStories;

    // Task counts
    private Integer totalTasks;
    private Integer completedTasks;
    private Integer inProgressTasks;
    private Integer blockedTasks;
    private Integer overdueTasks;

    // Feature counts
    private Integer totalFeatures;
    private Integer completedFeatures;
    private Integer inProgressFeatures;

    // Issue counts
    private Integer openIssues;
    private Integer highPriorityIssues;

    // Recent activity summary
    private List<String> recentCompletedItems;
    private List<String> currentBlockers;
    private List<String> upcomingDeadlines;
}
