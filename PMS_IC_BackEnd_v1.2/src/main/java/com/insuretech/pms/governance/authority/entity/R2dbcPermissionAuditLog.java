package com.insuretech.pms.governance.authority.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "permission_audit_log", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcPermissionAuditLog implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("actor_id")
    private String actorId;

    @Column("action_type")
    private String actionType;

    @Column("target_type")
    private String targetType;

    @Column("target_id")
    private String targetId;

    @Nullable
    @Column("reason")
    private String reason;

    @Column("payload_json")
    @Builder.Default
    private String payloadJson = "{}";

    @Column("created_at")
    private OffsetDateTime createdAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
