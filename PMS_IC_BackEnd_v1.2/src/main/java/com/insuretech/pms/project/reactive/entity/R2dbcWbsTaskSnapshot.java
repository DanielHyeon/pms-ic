package com.insuretech.pms.project.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * R2DBC WBS Task Snapshot Entity - Stores backup data for WbsTask
 */
@Table(name = "wbs_tasks_snapshot", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsTaskSnapshot {

    @Id
    @Column("id")
    private String id;

    @Column("snapshot_id")
    private String snapshotId;

    @Column("original_id")
    private String originalId;

    @Column("original_item_id")
    private String originalItemId;

    @Column("original_group_id")
    private String originalGroupId;

    @Column("phase_id")
    private String phaseId;

    @Column("code")
    private String code;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("status")
    private String status;

    @Nullable
    @Column("progress")
    private Integer progress;

    @Nullable
    @Column("weight")
    private Integer weight;

    @Nullable
    @Column("order_num")
    private Integer orderNum;

    @Nullable
    @Column("estimated_hours")
    private Integer estimatedHours;

    @Nullable
    @Column("actual_hours")
    private Integer actualHours;

    @Nullable
    @Column("assignee_id")
    private String assigneeId;

    @Nullable
    @Column("linked_task_id")
    private String linkedTaskId;

    @Nullable
    @Column("planned_start_date")
    private LocalDate plannedStartDate;

    @Nullable
    @Column("planned_end_date")
    private LocalDate plannedEndDate;

    @Nullable
    @Column("actual_start_date")
    private LocalDate actualStartDate;

    @Nullable
    @Column("actual_end_date")
    private LocalDate actualEndDate;

    @Nullable
    @Column("original_created_at")
    private LocalDateTime originalCreatedAt;

    @Nullable
    @Column("original_created_by")
    private String originalCreatedBy;

    @Nullable
    @Column("original_updated_at")
    private LocalDateTime originalUpdatedAt;

    @Nullable
    @Column("original_updated_by")
    private String originalUpdatedBy;

    /**
     * Create a snapshot from R2dbcWbsTask entity
     */
    public static R2dbcWbsTaskSnapshot fromEntity(R2dbcWbsTask task, String snapshotId) {
        return R2dbcWbsTaskSnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(task.getId())
                .originalItemId(task.getItemId())
                .originalGroupId(task.getGroupId())
                .phaseId(task.getPhaseId())
                .code(task.getCode())
                .name(task.getName())
                .description(task.getDescription())
                .status(task.getStatus())
                .progress(task.getProgress())
                .weight(task.getWeight())
                .orderNum(task.getOrderNum())
                .estimatedHours(task.getEstimatedHours())
                .actualHours(task.getActualHours())
                .assigneeId(task.getAssigneeId())
                .linkedTaskId(task.getLinkedTaskId())
                .plannedStartDate(task.getPlannedStartDate())
                .plannedEndDate(task.getPlannedEndDate())
                .actualStartDate(task.getActualStartDate())
                .actualEndDate(task.getActualEndDate())
                .originalCreatedAt(task.getCreatedAt())
                .originalCreatedBy(task.getCreatedBy())
                .originalUpdatedAt(task.getUpdatedAt())
                .originalUpdatedBy(task.getUpdatedBy())
                .build();
    }
}
