package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "features", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcFeature extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("epic_id")
    private String epicId;

    @Nullable
    @Column("part_id")
    private String partId;

    @Nullable
    @Column("wbs_group_id")
    private String wbsGroupId;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("status")
    @Builder.Default
    private String status = "OPEN";

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Column("order_num")
    @Builder.Default
    private Integer orderNum = 0;

    public enum FeatureStatus {
        OPEN,
        IN_PROGRESS,
        DONE,
        CANCELLED
    }

    public enum Priority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }
}
