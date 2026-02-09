package com.insuretech.pms.governance.authority.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "governance_findings", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcGovernanceFinding implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("run_id")
    private String runId;

    @Column("project_id")
    private String projectId;

    @Column("finding_type")
    private String findingType;

    @Column("severity")
    private String severity;

    @Nullable
    @Column("user_id")
    private String userId;

    @Nullable
    @Column("delegation_id")
    private String delegationId;

    @Column("message")
    private String message;

    @Column("details_json")
    @Builder.Default
    private String detailsJson = "{}";

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
