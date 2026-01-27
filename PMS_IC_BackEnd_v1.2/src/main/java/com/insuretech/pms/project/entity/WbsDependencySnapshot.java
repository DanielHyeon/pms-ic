package com.insuretech.pms.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * WBS Dependency Snapshot Entity - Stores backup data for WbsDependency
 */
@Entity
@Table(name = "wbs_dependencies_snapshot", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsDependencySnapshot {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "snapshot_id", nullable = false, length = 36)
    private String snapshotId;

    @Column(name = "original_id", nullable = false, length = 36)
    private String originalId;

    @Column(name = "predecessor_type", nullable = false, length = 20)
    private String predecessorType;

    @Column(name = "predecessor_id", nullable = false, length = 36)
    private String predecessorId;

    @Column(name = "successor_type", nullable = false, length = 20)
    private String successorType;

    @Column(name = "successor_id", nullable = false, length = 36)
    private String successorId;

    @Column(name = "dependency_type", nullable = false, length = 10)
    private String dependencyType;

    @Column(name = "lag_days")
    private Integer lagDays;

    @Column(name = "project_id", nullable = false, length = 50)
    private String projectId;

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
     * Create a snapshot from a WbsDependency entity
     */
    public static WbsDependencySnapshot fromEntity(WbsDependency dep, String snapshotId) {
        return WbsDependencySnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(dep.getId())
                .predecessorType(dep.getPredecessorType().name())
                .predecessorId(dep.getPredecessorId())
                .successorType(dep.getSuccessorType().name())
                .successorId(dep.getSuccessorId())
                .dependencyType(dep.getDependencyType().name())
                .lagDays(dep.getLagDays())
                .projectId(dep.getProjectId())
                .originalCreatedAt(dep.getCreatedAt())
                .originalCreatedBy(dep.getCreatedBy())
                .originalUpdatedAt(dep.getUpdatedAt())
                .originalUpdatedBy(dep.getUpdatedBy())
                .build();
    }
}
