package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.math.BigDecimal;

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

    @Column("project_id")
    private String projectId;

    @Column("name")
    private String name;

    @Nullable
    @Column("category")
    private String category;

    @Nullable
    @Column("target")
    private BigDecimal target;

    @Nullable
    @Column("current")
    private BigDecimal current;

    @Column("status")
    @Builder.Default
    private String status = "ON_TRACK";

    public enum KpiStatus {
        ACHIEVED,
        ON_TRACK,
        AT_RISK
    }
}
