package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "parts", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcPart extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("project_id")
    private String projectId;

    @Nullable
    @Column("leader_id")
    private String leaderId;

    @Nullable
    @Column("leader_name")
    private String leaderName;

    @Column("status")
    @Builder.Default
    private String status = "ACTIVE";

    @Nullable
    @Column("start_date")
    private LocalDate startDate;

    @Nullable
    @Column("end_date")
    private LocalDate endDate;

    @Column("progress")
    @Builder.Default
    private Integer progress = 0;

    public enum PartStatus {
        ACTIVE,
        INACTIVE,
        COMPLETED
    }
}
