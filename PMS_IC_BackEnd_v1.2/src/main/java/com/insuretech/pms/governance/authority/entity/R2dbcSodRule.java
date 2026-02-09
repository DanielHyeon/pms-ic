package com.insuretech.pms.governance.authority.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table(name = "sod_rules", schema = "governance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcSodRule implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("capability_a_id")
    private String capabilityAId;

    @Column("capability_b_id")
    private String capabilityBId;

    @Column("description")
    private String description;

    @Column("severity")
    private String severity;

    @Column("is_blocking")
    @Builder.Default
    private boolean isBlocking = false;

    @Transient
    @Builder.Default
    private boolean isNew = false;

    @Override
    public boolean isNew() {
        return isNew;
    }
}
