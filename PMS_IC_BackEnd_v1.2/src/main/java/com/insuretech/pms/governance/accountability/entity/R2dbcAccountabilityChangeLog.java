package com.insuretech.pms.governance.accountability.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "accountability_change_log", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcAccountabilityChangeLog implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("change_type")
    private String changeType;

    @Nullable
    @Column("previous_user_id")
    private String previousUserId;

    @Nullable
    @Column("new_user_id")
    private String newUserId;

    @Column("changed_by")
    private String changedBy;

    @Column("change_reason")
    private String changeReason;

    @Column("changed_at")
    private OffsetDateTime changedAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
