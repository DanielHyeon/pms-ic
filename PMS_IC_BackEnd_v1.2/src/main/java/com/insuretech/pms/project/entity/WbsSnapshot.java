package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * WBS Snapshot Entity - Metadata for WBS backup/restore
 * Stores information about snapshots created before template application
 */
@Entity
@Table(name = "wbs_snapshots", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsSnapshot extends BaseEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "phase_id", nullable = false, length = 50)
    private String phaseId;

    @Column(name = "project_id", nullable = false, length = 50)
    private String projectId;

    @Column(name = "snapshot_name", nullable = false, length = 255)
    private String snapshotName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "snapshot_type", nullable = false, length = 20)
    @Builder.Default
    private SnapshotType snapshotType = SnapshotType.PRE_TEMPLATE;

    @Column(name = "group_count")
    @Builder.Default
    private Integer groupCount = 0;

    @Column(name = "item_count")
    @Builder.Default
    private Integer itemCount = 0;

    @Column(name = "task_count")
    @Builder.Default
    private Integer taskCount = 0;

    @Column(name = "dependency_count")
    @Builder.Default
    private Integer dependencyCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SnapshotStatus status = SnapshotStatus.ACTIVE;

    @Column(name = "restored_at")
    private LocalDateTime restoredAt;

    @Column(name = "restored_by", length = 36)
    private String restoredBy;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

    public enum SnapshotType {
        PRE_TEMPLATE,  // Automatic backup before template application
        MANUAL         // User-triggered manual backup
    }

    public enum SnapshotStatus {
        ACTIVE,    // Can be restored
        RESTORED,  // Already used for restoration
        DELETED    // Soft deleted
    }
}
