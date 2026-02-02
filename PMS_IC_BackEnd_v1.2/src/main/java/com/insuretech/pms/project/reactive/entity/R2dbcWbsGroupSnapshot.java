package com.insuretech.pms.project.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * R2DBC WBS Group Snapshot Entity - Stores backup data for WbsGroup
 */
@Table(name = "wbs_groups_snapshot", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsGroupSnapshot {

    @Id
    @Column("id")
    private String id;

    @Column("snapshot_id")
    private String snapshotId;

    @Column("original_id")
    private String originalId;

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
    @Column("linked_epic_id")
    private String linkedEpicId;

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
     * Create a snapshot from R2dbcWbsGroup entity
     */
    public static R2dbcWbsGroupSnapshot fromEntity(R2dbcWbsGroup group, String snapshotId) {
        return R2dbcWbsGroupSnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(group.getId())
                .phaseId(group.getPhaseId())
                .code(group.getCode())
                .name(group.getName())
                .description(group.getDescription())
                .status(group.getStatus())
                .progress(group.getProgress())
                .plannedStartDate(group.getPlannedStartDate())
                .plannedEndDate(group.getPlannedEndDate())
                .actualStartDate(group.getActualStartDate())
                .actualEndDate(group.getActualEndDate())
                .weight(group.getWeight())
                .orderNum(group.getOrderNum())
                .linkedEpicId(group.getLinkedEpicId())
                .originalCreatedAt(group.getCreatedAt())
                .originalCreatedBy(group.getCreatedBy())
                .originalUpdatedAt(group.getUpdatedAt())
                .originalUpdatedBy(group.getUpdatedBy())
                .build();
    }
}
