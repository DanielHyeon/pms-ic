package com.insuretech.pms.education.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "education_roadmaps", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEducationRoadmap extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("education_id")
    private String educationId;

    @Column("target_role")
    private String targetRole;

    @Column("level")
    @Builder.Default
    private String level = "BASIC";

    @Column("order_num")
    @Builder.Default
    private Integer orderNum = 1;

    @Column("is_required")
    @Builder.Default
    private Boolean isRequired = false;

    @Nullable
    @Column("description")
    private String description;
}
