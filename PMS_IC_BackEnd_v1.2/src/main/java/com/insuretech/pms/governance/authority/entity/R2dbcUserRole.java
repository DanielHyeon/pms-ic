package com.insuretech.pms.governance.authority.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "user_roles", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcUserRole implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("user_id")
    private String userId;

    @Column("role_id")
    private String roleId;

    @Column("granted_by")
    private String grantedBy;

    @Column("granted_at")
    private OffsetDateTime grantedAt;

    @Nullable
    @Column("reason")
    private String reason;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
