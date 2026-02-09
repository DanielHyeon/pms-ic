package com.insuretech.pms.governance.accountability.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "project_accountability", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcProjectAccountability implements Persistable<String> {

    @Id
    @Column("project_id")
    private String projectId;

    @Column("primary_pm_user_id")
    private String primaryPmUserId;

    @Nullable
    @Column("co_pm_user_id")
    private String coPmUserId;

    @Nullable
    @Column("sponsor_user_id")
    private String sponsorUserId;

    @Column("updated_at")
    private OffsetDateTime updatedAt;

    @Column("updated_by")
    private String updatedBy;

    @Transient
    @Builder.Default
    private boolean isNew = false;

    @Override
    public String getId() {
        return projectId;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }
}
