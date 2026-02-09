package com.insuretech.pms.governance.authority.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.OffsetDateTime;

@Table(name = "capabilities", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcCapability implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("code")
    private String code;

    @Column("name")
    private String name;

    @Column("category")
    private String category;

    @Nullable
    @Column("description")
    private String description;

    @Column("is_delegatable")
    @Builder.Default
    private boolean isDelegatable = false;

    @Column("allow_redelegation")
    @Builder.Default
    private boolean allowRedelegation = false;

    @Column("created_at")
    private OffsetDateTime createdAt;

    @Column("created_by")
    private String createdBy;

    @Transient
    @Builder.Default
    private boolean isNew = false;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
