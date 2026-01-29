package com.insuretech.pms.task.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "weekly_reports", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWeeklyReport extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Nullable
    @Column("sprint_id")
    private String sprintId;

    @Column("week_start_date")
    private LocalDate weekStartDate;

    @Column("week_end_date")
    private LocalDate weekEndDate;

    @Nullable
    @Column("generated_by")
    private String generatedBy;

    @Column("generated_at")
    private LocalDate generatedAt;

    @Nullable
    @Column("total_tasks")
    private Integer totalTasks;

    @Nullable
    @Column("completed_tasks")
    private Integer completedTasks;

    @Nullable
    @Column("in_progress_tasks")
    private Integer inProgressTasks;

    @Nullable
    @Column("todo_tasks")
    private Integer todoTasks;

    @Nullable
    @Column("blocked_tasks")
    private Integer blockedTasks;

    @Nullable
    @Column("completion_rate")
    private Double completionRate;

    @Nullable
    @Column("velocity")
    private Double velocity;

    @Nullable
    @Column("story_points_completed")
    private Integer storyPointsCompleted;

    @Nullable
    @Column("story_points_in_progress")
    private Integer storyPointsInProgress;

    @Nullable
    @Column("story_points_planned")
    private Integer storyPointsPlanned;

    @Nullable
    @Column("average_wip_count")
    private Integer averageWipCount;

    @Nullable
    @Column("peak_wip_count")
    private Integer peakWipCount;

    @Nullable
    @Column("flow_efficiency")
    private Double flowEfficiency;

    @Nullable
    @Column("bottlenecks")
    private String bottlenecks;

    @Nullable
    @Column("velocity_trend")
    private Double velocityTrend;

    @Nullable
    @Column("completion_trend")
    private Double completionTrend;

    @Nullable
    @Column("recommendations")
    private String recommendations;

    @Nullable
    @Column("summary")
    private String summary;

    @Nullable
    @Column("generated_content")
    private String generatedContent;

    @Nullable
    @Column("llm_model")
    private String llmModel;

    @Nullable
    @Column("llm_confidence_score")
    private Double llmConfidenceScore;
}
