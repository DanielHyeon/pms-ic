package com.insuretech.pms.rfp.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Table(name = "rfp_extraction_runs", schema = "rfp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcExtractionRun {

    @Id
    @Column("id")
    private String id;

    @Column("rfp_id")
    private String rfpId;

    @Nullable
    @Column("rfp_version_id")
    private String rfpVersionId;

    @Nullable
    @Column("model_name")
    private String modelName;

    @Nullable
    @Column("model_version")
    private String modelVersion;

    @Nullable
    @Column("prompt_version")
    private String promptVersion;

    @Nullable
    @Column("schema_version")
    private String schemaVersion;

    @Nullable
    @Column("generation_params")
    private String generationParams;

    @Column("status")
    @Builder.Default
    private String status = "PENDING";

    @Column("is_active")
    @Builder.Default
    private Boolean isActive = false;

    @Nullable
    @Column("total_candidates")
    private Integer totalCandidates;

    @Nullable
    @Column("ambiguity_count")
    private Integer ambiguityCount;

    @Nullable
    @Column("avg_confidence")
    private BigDecimal avgConfidence;

    @Nullable
    @Column("category_breakdown")
    private String categoryBreakdown;

    @Nullable
    @Column("error_message")
    private String errorMessage;

    @Nullable
    @Column("started_at")
    private LocalDateTime startedAt;

    @Nullable
    @Column("finished_at")
    private LocalDateTime finishedAt;

    @Column("created_at")
    private LocalDateTime createdAt;

    @Nullable
    @Column("created_by")
    private String createdBy;
}
