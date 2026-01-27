package com.insuretech.pms.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * WBS Group Snapshot Entity - Stores backup data for WbsGroup
 */
@Entity
@Table(name = "wbs_groups_snapshot", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsGroupSnapshot {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "snapshot_id", nullable = false, length = 36)
    private String snapshotId;

    @Column(name = "original_id", nullable = false, length = 36)
    private String originalId;

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

    @Column(name = "linked_epic_id", length = 36)
    private String linkedEpicId;

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
     * Create a snapshot from a WbsGroup entity
     */
    public static WbsGroupSnapshot fromEntity(WbsGroup group, String snapshotId) {
        return WbsGroupSnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(group.getId())
                .phaseId(group.getPhase().getId())
                .code(group.getCode())
                .name(group.getName())
                .description(group.getDescription())
                .status(group.getStatus().name())
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
