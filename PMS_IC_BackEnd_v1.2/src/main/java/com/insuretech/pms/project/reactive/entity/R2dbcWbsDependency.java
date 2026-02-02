package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table(name = "wbs_dependencies", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsDependency extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("predecessor_type")
    private String predecessorType;

    @Column("predecessor_id")
    private String predecessorId;

    @Column("successor_type")
    private String successorType;

    @Column("successor_id")
    private String successorId;

    @Column("dependency_type")
    @Builder.Default
    private String dependencyType = "FS";

    @Column("lag_days")
    @Builder.Default
    private Integer lagDays = 0;

    @Column("project_id")
    private String projectId;

    public enum WbsItemType {
        GROUP,
        ITEM,
        TASK
    }

    public enum DependencyType {
        FS,
        SS,
        FF,
        SF
    }
}
