package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * WBS Dependency Entity - Represents predecessor/successor relationships
 * Used for Gantt chart dependency visualization
 */
@Entity
@Table(name = "wbs_dependencies", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsDependency extends BaseEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "predecessor_type", nullable = false, length = 20)
    private WbsItemType predecessorType;

    @Column(name = "predecessor_id", nullable = false, length = 36)
    private String predecessorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "successor_type", nullable = false, length = 20)
    private WbsItemType successorType;

    @Column(name = "successor_id", nullable = false, length = 36)
    private String successorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "dependency_type", nullable = false, length = 10)
    @Builder.Default
    private DependencyType dependencyType = DependencyType.FS;

    @Column(name = "lag_days")
    @Builder.Default
    private Integer lagDays = 0;

    @Column(name = "project_id", nullable = false, length = 50)
    private String projectId;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

    public enum WbsItemType {
        GROUP, ITEM, TASK
    }

    public enum DependencyType {
        FS,  // Finish-to-Start (default)
        SS,  // Start-to-Start
        FF,  // Finish-to-Finish
        SF   // Start-to-Finish
    }
}
