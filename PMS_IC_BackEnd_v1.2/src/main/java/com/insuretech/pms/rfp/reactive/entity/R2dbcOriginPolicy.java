package com.insuretech.pms.rfp.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "origin_policies", schema = "rfp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcOriginPolicy {

    @Id
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("origin_type")
    private String originType;

    @Column("require_source_rfp_id")
    @Builder.Default
    private Boolean requireSourceRfpId = true;

    @Column("evidence_level")
    @Builder.Default
    private String evidenceLevel = "FULL";

    @Column("change_approval_required")
    @Builder.Default
    private Boolean changeApprovalRequired = true;

    @Column("auto_analysis_enabled")
    @Builder.Default
    private Boolean autoAnalysisEnabled = true;

    @Column("lineage_enforcement")
    @Builder.Default
    private String lineageEnforcement = "STRICT";

    @Column("created_at")
    private LocalDateTime createdAt;

    @Column("updated_at")
    private LocalDateTime updatedAt;

    @Nullable
    @Column("created_by")
    private String createdBy;

    @Nullable
    @Column("updated_by")
    private String updatedBy;
}
