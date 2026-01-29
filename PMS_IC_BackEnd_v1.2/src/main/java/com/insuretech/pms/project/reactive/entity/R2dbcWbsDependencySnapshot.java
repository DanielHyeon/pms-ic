package com.insuretech.pms.project.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

/**
 * R2DBC WBS Dependency Snapshot Entity - Stores backup data for WbsDependency
 */
@Table(name = "wbs_dependencies_snapshot", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsDependencySnapshot {

    @Id
    @Column("id")
    private String id;

    @Column("snapshot_id")
    private String snapshotId;

    @Column("original_id")
    private String originalId;

    @Column("predecessor_type")
    private String predecessorType;

    @Column("predecessor_id")
    private String predecessorId;

    @Column("successor_type")
    private String successorType;

    @Column("successor_id")
    private String successorId;

    @Column("dependency_type")
    private String dependencyType;

    @Nullable
    @Column("lag_days")
    private Integer lagDays;

    @Column("project_id")
    private String projectId;

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
     * Create a snapshot from R2dbcWbsDependency entity
     */
    public static R2dbcWbsDependencySnapshot fromEntity(R2dbcWbsDependency dep, String snapshotId) {
        return R2dbcWbsDependencySnapshot.builder()
                .snapshotId(snapshotId)
                .originalId(dep.getId())
                .predecessorType(dep.getPredecessorType())
                .predecessorId(dep.getPredecessorId())
                .successorType(dep.getSuccessorType())
                .successorId(dep.getSuccessorId())
                .dependencyType(dep.getDependencyType())
                .lagDays(dep.getLagDays())
                .projectId(dep.getProjectId())
                .originalCreatedAt(dep.getCreatedAt())
                .originalCreatedBy(dep.getCreatedBy())
                .originalUpdatedAt(dep.getUpdatedAt())
                .originalUpdatedBy(dep.getUpdatedBy())
                .build();
    }
}
