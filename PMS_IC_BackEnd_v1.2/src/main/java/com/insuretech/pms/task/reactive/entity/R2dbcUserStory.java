package com.insuretech.pms.task.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "user_stories", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcUserStory extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Nullable
    @Column("sprint_id")
    private String sprintId;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Nullable
    @Column("acceptance_criteria")
    private String acceptanceCriteria;

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Nullable
    @Column("story_points")
    private Integer storyPoints;

    @Column("status")
    @Builder.Default
    private String status = "IDEA";

    @Nullable
    @Column("assignee_id")
    private String assigneeId;

    @Nullable
    @Column("epic")
    private String epic;

    @Nullable
    @Column("epic_id")
    private String epicId;

    @Nullable
    @Column("priority_order")
    private Integer priorityOrder;

    @Nullable
    @Column("feature_id")
    private String featureId;

    @Nullable
    @Column("wbs_item_id")
    private String wbsItemId;

    @Nullable
    @Column("part_id")
    private String partId;

    @Nullable
    @Column("backlog_item_id")
    private String backlogItemId;

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum StoryStatus {
        IDEA,
        REFINED,
        READY,
        IN_SPRINT,
        IN_PROGRESS,
        REVIEW,
        DONE,
        CANCELLED
    }
}
