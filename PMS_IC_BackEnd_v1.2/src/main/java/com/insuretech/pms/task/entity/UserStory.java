package com.insuretech.pms.task.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "user_stories", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "project_id", length = 50, nullable = false)
    private String projectId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "acceptance_criteria", columnDefinition = "TEXT")
    private String acceptanceCriteria;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private StoryStatus status = StoryStatus.IDEA;

    @Column(name = "assignee_id", length = 50)
    private String assigneeId;

    @Column(name = "epic", length = 100)
    private String epic;

    @Column(name = "priority_order")
    private Integer priorityOrder;

    /**
     * Feature ID for Feature-Story integration
     */
    @Column(name = "feature_id", length = 36)
    private String featureId;

    /**
     * WBS Item ID for WbsItem-Story integration
     */
    @Column(name = "wbs_item_id", length = 36)
    private String wbsItemId;

    /**
     * Part (Work Area) ID - denormalized from Feature for query performance.
     * Derived from feature.part_id when feature is assigned.
     */
    @Column(name = "part_id", length = 50)
    private String partId;

    @ElementCollection
    @CollectionTable(name = "user_story_requirement_links", schema = "task",
            joinColumns = @JoinColumn(name = "user_story_id"))
    @Column(name = "requirement_id")
    @Builder.Default
    private Set<String> linkedRequirementIds = new HashSet<>();

    public void linkRequirement(String requirementId) {
        linkedRequirementIds.add(requirementId);
    }

    public void unlinkRequirement(String requirementId) {
        linkedRequirementIds.remove(requirementId);
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    /**
     * Story status flow based on Scrum design document:
     * IDEA -> REFINED -> READY -> IN_SPRINT -> IN_PROGRESS -> REVIEW -> DONE
     */
    public enum StoryStatus {
        IDEA,           // Initial concept, not yet refined
        REFINED,        // Refined with acceptance criteria defined
        READY,          // Ready for sprint planning (was BACKLOG)
        IN_SPRINT,      // Committed to sprint (was SELECTED)
        IN_PROGRESS,    // Active development
        REVIEW,         // Code review / QA
        DONE,           // Completed (was COMPLETED)
        CANCELLED       // Removed from backlog
    }
}