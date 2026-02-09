package com.insuretech.pms.rfp.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "rfp_versions", schema = "rfp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRfpVersion {

    @Id
    @Column("id")
    private String id;

    @Column("rfp_id")
    private String rfpId;

    @Column("version_label")
    private String versionLabel;

    @Column("file_name")
    private String fileName;

    @Nullable
    @Column("file_path")
    private String filePath;

    @Nullable
    @Column("file_type")
    private String fileType;

    @Nullable
    @Column("file_size")
    private Long fileSize;

    @Nullable
    @Column("checksum")
    private String checksum;

    @Nullable
    @Column("uploaded_by")
    private String uploadedBy;

    @Nullable
    @Column("uploaded_at")
    private LocalDateTime uploadedAt;

    @Column("created_at")
    private LocalDateTime createdAt;
}
