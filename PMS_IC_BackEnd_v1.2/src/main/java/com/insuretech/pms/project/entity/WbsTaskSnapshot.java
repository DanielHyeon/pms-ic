package com.insuretech.pms.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * WBS Task Snapshot Entity - Stores backup data for WbsTask
 */
@Entity
@Table(name = "wbs_tasks_snapshot", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsTaskSnapshot {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "snapshot_id", nullable = false, length = 36)
    private String snapshotId;

    @Column(name = "original_id", nullable = false, length = 36)
    private String originalId;

    @Column(name = "original_item_id", nullable = false, length = 36)
    private String originalItemId;

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

    @Column(name = "linked_task_id", length = 50)
    private String linkedTaskId;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

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
     * Create a snapshot from a WbsTask entity
     */
    public static WbsTaskSnapshot fromEntity(WbsTask task, String snapshotId) {
        return WbsTaskSnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(task.getId())
                .originalItemId(task.getItem().getId())
                .originalGroupId(task.getGroup().getId())
                .phaseId(task.getPhase().getId())
                .code(task.getCode())
                .name(task.getName())
                .description(task.getDescription())
                .status(task.getStatus().name())
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
