package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.math.BigDecimal;
import java.time.LocalDate;

@Table(name = "projects", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcProject extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("status")
    @Builder.Default
    private String status = "PLANNING";

    @Nullable
    @Column("start_date")
    private LocalDate startDate;

    @Nullable
    @Column("end_date")
    private LocalDate endDate;

    @Nullable
    @Column("budget")
    private BigDecimal budget;

    @Column("ai_weight")
    @Builder.Default
    private BigDecimal aiWeight = new BigDecimal("0.70");

    @Column("si_weight")
    @Builder.Default
    private BigDecimal siWeight = new BigDecimal("0.30");

    @Column("progress")
    @Builder.Default
    private Integer progress = 0;

    @Column("is_default")
    @Builder.Default
    private Boolean isDefault = false;

    public enum ProjectStatus {
        PLANNING,
        IN_PROGRESS,
        ON_HOLD,
        COMPLETED,
        CANCELLED
    }
}
