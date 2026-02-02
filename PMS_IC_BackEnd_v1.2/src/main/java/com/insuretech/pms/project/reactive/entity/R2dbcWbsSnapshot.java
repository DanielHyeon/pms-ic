package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

/**
 * R2DBC WBS Snapshot Entity - Metadata for WBS backup/restore
 */
@Table(name = "wbs_snapshots", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsSnapshot extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("phase_id")
    private String phaseId;

    @Column("project_id")
    private String projectId;

    @Column("snapshot_name")
    private String snapshotName;

    @Nullable
    @Column("description")
    private String description;

    @Column("snapshot_type")
    @Builder.Default
    private String snapshotType = "PRE_TEMPLATE";

    @Column("group_count")
    @Builder.Default
    private Integer groupCount = 0;

    @Column("item_count")
    @Builder.Default
    private Integer itemCount = 0;

    @Column("task_count")
    @Builder.Default
    private Integer taskCount = 0;

    @Column("dependency_count")
    @Builder.Default
    private Integer dependencyCount = 0;

    @Column("status")
    @Builder.Default
    private String status = "ACTIVE";

    @Nullable
    @Column("restored_at")
    private LocalDateTime restoredAt;

    @Nullable
    @Column("restored_by")
    private String restoredBy;

    public enum SnapshotType {
        PRE_TEMPLATE,
        MANUAL
    }

    public enum SnapshotStatus {
        ACTIVE,
        RESTORED,
        DELETED
    }
}
