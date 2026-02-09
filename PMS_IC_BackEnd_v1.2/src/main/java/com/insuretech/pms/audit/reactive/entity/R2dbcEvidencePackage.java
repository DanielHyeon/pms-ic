package com.insuretech.pms.audit.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "evidence_packages", schema = "audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEvidencePackage {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("requested_by")
    private String requestedBy;

    @Column("status")
    @Builder.Default
    private String status = "PENDING";

    @Column("package_type")
    @Builder.Default
    private String packageType = "ZIP";

    @Nullable
    @Column("filter_snapshot")
    private String filterSnapshot;

    @Nullable
    @Column("selection_ids")
    private String selectionIds;

    @Column("total_items")
    @Builder.Default
    private Integer totalItems = 0;

    @Column("processed_items")
    @Builder.Default
    private Integer processedItems = 0;

    @Nullable
    @Column("file_path")
    private String filePath;

    @Nullable
    @Column("file_size_bytes")
    private Long fileSizeBytes;

    @Nullable
    @Column("download_url")
    private String downloadUrl;

    @Nullable
    @Column("download_expires_at")
    private LocalDateTime downloadExpiresAt;

    @Nullable
    @Column("sealed_at")
    private LocalDateTime sealedAt;

    @Nullable
    @Column("selection_hash")
    private String selectionHash;

    @Nullable
    @Column("error_message")
    private String errorMessage;

    @Column("created_at")
    private LocalDateTime createdAt;

    @Nullable
    @Column("completed_at")
    private LocalDateTime completedAt;
}
