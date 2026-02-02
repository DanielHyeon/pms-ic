package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "wbs_tasks", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsTask extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("item_id")
    private String itemId;

    @Column("group_id")
    private String groupId;

    @Column("phase_id")
    private String phaseId;

    @Column("code")
    private String code;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("status")
    @Builder.Default
    private String status = "NOT_STARTED";

    @Column("progress")
    @Builder.Default
    private Integer progress = 0;

    @Column("weight")
    @Builder.Default
    private Integer weight = 100;

    @Column("order_num")
    @Builder.Default
    private Integer orderNum = 0;

    @Nullable
    @Column("estimated_hours")
    private Integer estimatedHours;

    @Nullable
    @Column("actual_hours")
    private Integer actualHours;

    @Nullable
    @Column("assignee_id")
    private String assigneeId;

    @Nullable
    @Column("linked_task_id")
    private String linkedTaskId;

    @Nullable
    @Column("planned_start_date")
    private LocalDate plannedStartDate;

    @Nullable
    @Column("planned_end_date")
    private LocalDate plannedEndDate;

    @Nullable
    @Column("actual_start_date")
    private LocalDate actualStartDate;

    @Nullable
    @Column("actual_end_date")
    private LocalDate actualEndDate;
}
