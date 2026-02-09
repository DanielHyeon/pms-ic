package com.insuretech.pms.ai.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

@Table(name = "briefing_cache", schema = "ai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcBriefingCache implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("role")
    private String role;

    @Column("scope")
    private String scope;

    @Column("as_of")
    private OffsetDateTime asOf;

    @Column("completeness")
    private String completeness;

    @Column("generation_method")
    private String generationMethod;

    @Column("response_json")
    private String responseJson;

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
