package com.insuretech.pms.task.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "tasks", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcTask extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("column_id")
    private String columnId;

    @Nullable
    @Column("phase_id")
    private String phaseId;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Nullable
    @Column("assignee_id")
    private String assigneeId;

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Column("status")
    @Builder.Default
    private String status = "TODO";

    @Nullable
    @Column("due_date")
    private LocalDate dueDate;

    @Nullable
    @Column("order_num")
    private Integer orderNum;

    @Nullable
    @Column("tags")
    private String tags;

    @Nullable
    @Column("sprint_id")
    private String sprintId;

    @Nullable
    @Column("user_story_id")
    private String userStoryId;

    @Nullable
    @Column("requirement_id")
    private String requirementId;

    @Nullable
    @Column("part_id")
    private String partId;

    @Column("track_type")
    @Builder.Default
    private String trackType = "COMMON";

    public enum Priority {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum TaskStatus {
        BACKLOG, TODO, IN_PROGRESS, REVIEW, TESTING, DONE
    }

    public enum TrackType {
        AI, SI, COMMON
    }
}
