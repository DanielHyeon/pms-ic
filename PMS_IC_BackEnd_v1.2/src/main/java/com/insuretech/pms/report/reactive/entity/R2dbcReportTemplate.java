package com.insuretech.pms.report.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.util.UUID;

@Table(name = "report_templates", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcReportTemplate extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private UUID id;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("report_type")
    private String reportType;

    @Column("scope")
    private String scope;

    @Nullable
    @Column("organization_id")
    private String organizationId;

    @Nullable
    @Column("target_roles")
    private String[] targetRoles;

    @Nullable
    @Column("target_report_scopes")
    private String[] targetReportScopes;

    // JSON structure stored as String - parsed in service layer
    @Column("structure")
    private String structure;

    @Nullable
    @Column("styling")
    private String styling;

    @Column("is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column("is_default")
    @Builder.Default
    private Boolean isDefault = false;

    @Column("version")
    @Builder.Default
    private Integer version = 1;
}
