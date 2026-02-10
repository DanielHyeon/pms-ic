package com.insuretech.pms.rfp.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
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
public class R2dbcOriginPolicy implements Persistable<String> {

    @Id
    private String id;

    // save() 호출 시 INSERT/UPDATE 판단용 플래그 (DB에 저장되지 않음)
    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

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
