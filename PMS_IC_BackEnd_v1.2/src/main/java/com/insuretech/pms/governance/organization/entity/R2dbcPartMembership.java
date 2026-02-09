package com.insuretech.pms.governance.organization.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "part_memberships", schema = "organization")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcPartMembership implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("part_id")
    private String partId;

    @Column("user_id")
    private String userId;

    @Column("membership_type")
    private String membershipType;

    @Column("joined_at")
    private OffsetDateTime joinedAt;

    @Column("joined_by")
    private String joinedBy;

    @Nullable
    @Column("left_at")
    private OffsetDateTime leftAt;

    @Nullable
    @Column("left_by")
    private String leftBy;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
