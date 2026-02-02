package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table(name = "project_members", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcProjectMember extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("user_id")
    private String userId;

    @Column("role")
    private String role;

    @Column("active")
    @Builder.Default
    private Boolean active = true;

    public enum ProjectRole {
        SPONSOR,
        PMO_HEAD,
        PM,
        DEVELOPER,
        QA,
        BUSINESS_ANALYST,
        MEMBER
    }
}
