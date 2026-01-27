package com.insuretech.pms.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * WBS Item Snapshot Entity - Stores backup data for WbsItem
 */
@Entity
@Table(name = "wbs_items_snapshot", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsItemSnapshot {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "snapshot_id", nullable = false, length = 36)
    private String snapshotId;

    @Column(name = "original_id", nullable = false, length = 36)
    private String originalId;

    @Column(name = "original_group_id", nullable = false, length = 36)
    private String originalGroupId;

    @Column(name = "phase_id", nullable = false, length = 50)
    private String phaseId;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "progress")
    private Integer progress;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @Column(name = "weight")
    private Integer weight;

    @Column(name = "order_num")
    private Integer orderNum;

    @Column(name = "estimated_hours")
    private Integer estimatedHours;

    @Column(name = "actual_hours")
    private Integer actualHours;

    @Column(name = "assignee_id", length = 36)
    private String assigneeId;

    @Column(name = "original_created_at")
    private LocalDateTime originalCreatedAt;

    @Column(name = "original_created_by", length = 36)
    private String originalCreatedBy;

    @Column(name = "original_updated_at")
    private LocalDateTime originalUpdatedAt;

    @Column(name = "original_updated_by", length = 36)
    private String originalUpdatedBy;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

    /**
     * Create a snapshot from a WbsItem entity
     */
    public static WbsItemSnapshot fromEntity(WbsItem item, String snapshotId) {
        return WbsItemSnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(item.getId())
                .originalGroupId(item.getGroup().getId())
                .phaseId(item.getPhase().getId())
                .code(item.getCode())
                .name(item.getName())
                .description(item.getDescription())
                .status(item.getStatus().name())
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
