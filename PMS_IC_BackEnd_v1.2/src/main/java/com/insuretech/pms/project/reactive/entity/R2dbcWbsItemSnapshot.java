package com.insuretech.pms.project.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * R2DBC WBS Item Snapshot Entity - Stores backup data for WbsItem
 */
@Table(name = "wbs_items_snapshot", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsItemSnapshot {

    @Id
    @Column("id")
    private String id;

    @Column("snapshot_id")
    private String snapshotId;

    @Column("original_id")
    private String originalId;

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
     * Create a snapshot from R2dbcWbsItem entity
     */
    public static R2dbcWbsItemSnapshot fromEntity(R2dbcWbsItem item, String snapshotId) {
        return R2dbcWbsItemSnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(item.getId())
                .originalGroupId(item.getGroupId())
                .phaseId(item.getPhaseId())
                .code(item.getCode())
                .name(item.getName())
                .description(item.getDescription())
                .status(item.getStatus())
                .progress(item.getProgress())
                .plannedStartDate(item.getPlannedStartDate())
                .plannedEndDate(item.getPlannedEndDate())
                .actualStartDate(item.getActualStartDate())
                .actualEndDate(item.getActualEndDate())
                .weight(item.getWeight())
                .orderNum(item.getOrderNum())
                .estimatedHours(item.getEstimatedHours())
                .actualHours(item.getActualHours())
                .assigneeId(item.getAssigneeId())
                .originalCreatedAt(item.getCreatedAt())
                .originalCreatedBy(item.getCreatedBy())
                .originalUpdatedAt(item.getUpdatedAt())
                .originalUpdatedBy(item.getUpdatedBy())
                .build();
    }
}
