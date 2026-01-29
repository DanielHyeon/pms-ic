package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "kpis", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcKpi extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("phase_id")
    private String phaseId;

    @Column("name")
    private String name;

    @Column("target")
    private String target;

    @Nullable
    @Column("current")
    private String current;

    @Column("status")
    @Builder.Default
    private String status = "ON_TRACK";

    public enum KpiStatus {
        ACHIEVED,
        ON_TRACK,
        AT_RISK
    }
}
