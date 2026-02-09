package com.insuretech.pms.governance.organization.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "parts", schema = "organization")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcOrgPart implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("name")
    private String name;

    @Column("part_type")
    private String partType;

    @Nullable
    @Column("custom_type_name")
    private String customTypeName;

    @Column("status")
    @Builder.Default
    private String status = "ACTIVE";

    @Nullable
    @Column("leader_user_id")
    private String leaderUserId;

    @Column("created_at")
    private OffsetDateTime createdAt;

    @Column("created_by")
    private String createdBy;

    @Nullable
    @Column("closed_at")
    private OffsetDateTime closedAt;

    @Nullable
    @Column("closed_by")
    private String closedBy;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
