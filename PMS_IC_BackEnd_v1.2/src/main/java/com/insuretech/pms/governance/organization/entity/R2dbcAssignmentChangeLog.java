package com.insuretech.pms.governance.organization.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "assignment_change_log", schema = "organization")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcAssignmentChangeLog implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Nullable
    @Column("part_id")
    private String partId;

    @Column("user_id")
    private String userId;

    @Column("change_type")
    private String changeType;

    @Nullable
    @Column("previous_value")
    private String previousValue;

    @Nullable
    @Column("new_value")
    private String newValue;

    @Column("changed_by")
    private String changedBy;

    @Nullable
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
