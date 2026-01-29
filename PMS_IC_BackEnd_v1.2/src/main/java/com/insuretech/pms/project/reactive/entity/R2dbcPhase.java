package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "phases", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcPhase extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("name")
    private String name;

    @Column("order_num")
    private Integer orderNum;

    @Column("status")
    @Builder.Default
    private String status = "NOT_STARTED";

    @Nullable
    @Column("gate_status")
    private String gateStatus;

    @Nullable
    @Column("start_date")
    private LocalDate startDate;

    @Nullable
    @Column("end_date")
    private LocalDate endDate;

    @Column("progress")
    @Builder.Default
    private Integer progress = 0;

    @Nullable
    @Column("description")
    private String description;

    @Column("track_type")
    @Builder.Default
    private String trackType = "COMMON";

    public enum PhaseStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        ON_HOLD
    }

    public enum GateStatus {
        PENDING,
        SUBMITTED,
        APPROVED,
        REJECTED
    }

    public enum TrackType {
        AI, SI, COMMON
    }
}
