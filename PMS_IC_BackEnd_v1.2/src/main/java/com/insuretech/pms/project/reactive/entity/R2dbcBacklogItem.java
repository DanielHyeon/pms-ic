package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "backlog_items", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcBacklogItem extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("backlog_id")
    private String backlogId;

    @Nullable
    @Column("requirement_id")
    private String requirementId;

    @Column("origin_type")
    @Builder.Default
    private String originType = "MANUAL";

    @Nullable
    @Column("epic_id_ref")
    private String epicIdRef;

    @Nullable
    @Column("epic_id")
    private String epicId;

    @Column("priority_order")
    private Integer priorityOrder;

    @Column("status")
    @Builder.Default
    private String status = "BACKLOG";

    @Nullable
    @Column("story_points")
    private Integer storyPoints;

    @Nullable
    @Column("estimated_effort_hours")
    private Integer estimatedEffortHours;

    @Nullable
    @Column("acceptance_criteria")
    private String acceptanceCriteria;

    @Nullable
    @Column("sprint_id")
    private String sprintId;

    public enum BacklogItemStatus {
        BACKLOG,
        SELECTED,
        SPRINT,
        COMPLETED
    }

    public enum BacklogItemOrigin {
        REQUIREMENT,
        MANUAL
    }
}
