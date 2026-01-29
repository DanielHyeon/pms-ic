package com.insuretech.pms.task.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "sprints", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcSprint extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("name")
    private String name;

    @Nullable
    @Column("goal")
    private String goal;

    @Nullable
    @Column("start_date")
    private LocalDate startDate;

    @Nullable
    @Column("end_date")
    private LocalDate endDate;

    @Column("status")
    @Builder.Default
    private String status = "PLANNED";

    @Nullable
    @Column("conwip_limit")
    private Integer conwipLimit;

    @Column("enable_wip_validation")
    @Builder.Default
    private Boolean enableWipValidation = true;

    @Nullable
    @Column("neo4j_node_id")
    private String neo4jNodeId;

    public enum SprintStatus {
        PLANNED,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }
}
