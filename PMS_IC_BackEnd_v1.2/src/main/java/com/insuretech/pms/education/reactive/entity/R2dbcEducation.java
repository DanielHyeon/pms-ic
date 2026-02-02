package com.insuretech.pms.education.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "educations", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEducation extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Column("education_type")
    @Builder.Default
    private String educationType = "IT_BASIC";

    @Column("category")
    @Builder.Default
    private String category = "AGENT_AI";

    @Column("target_role")
    @Builder.Default
    private String targetRole = "ALL";

    @Nullable
    @Column("duration_hours")
    private Integer durationHours;

    @Nullable
    @Column("prerequisites")
    private String prerequisites;

    @Nullable
    @Column("learning_objectives")
    private String learningObjectives;

    @Nullable
    @Column("instructor")
    private String instructor;

    @Nullable
    @Column("materials")
    private String materials;

    @Column("is_active")
    @Builder.Default
    private Boolean isActive = true;
}
