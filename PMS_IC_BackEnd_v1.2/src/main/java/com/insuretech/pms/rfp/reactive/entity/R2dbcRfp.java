package com.insuretech.pms.rfp.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "rfps", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRfp extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("title")
    private String title;

    @Nullable
    @Column("content")
    private String content;

    @Nullable
    @Column("file_path")
    private String filePath;

    @Nullable
    @Column("file_name")
    private String fileName;

    @Nullable
    @Column("file_type")
    private String fileType;

    @Nullable
    @Column("file_size")
    private Long fileSize;

    @Column("status")
    @Builder.Default
    private String status = "DRAFT";

    @Column("processing_status")
    @Builder.Default
    private String processingStatus = "PENDING";

    @Nullable
    @Column("processing_message")
    private String processingMessage;

    @Nullable
    @Column("submitted_at")
    private LocalDateTime submittedAt;

    @Column("tenant_id")
    private String tenantId;
}
