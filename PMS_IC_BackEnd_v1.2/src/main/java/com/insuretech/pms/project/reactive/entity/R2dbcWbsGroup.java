package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "wbs_groups", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcWbsGroup extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

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

    @Column("weight")
    @Builder.Default
    private Integer weight = 100;

    @Column("order_num")
    @Builder.Default
    private Integer orderNum = 0;

    @Nullable
    @Column("linked_epic_id")
    private String linkedEpicId;

    public enum WbsStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        ON_HOLD,
        CANCELLED
    }
}
