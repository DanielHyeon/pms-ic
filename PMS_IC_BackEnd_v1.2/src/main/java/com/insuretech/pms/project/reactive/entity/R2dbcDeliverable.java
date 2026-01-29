package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "deliverables", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDeliverable extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("phase_id")
    private String phaseId;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("type")
    private String type;

    @Column("status")
    @Builder.Default
    private String status = "PENDING";

    @Nullable
    @Column("file_path")
    private String filePath;

    @Nullable
    @Column("file_name")
    private String fileName;

    @Nullable
    @Column("file_size")
    private Long fileSize;

    @Nullable
    @Column("uploaded_by")
    private String uploadedBy;

    @Nullable
    @Column("approver")
    private String approver;

    @Nullable
    @Column("approved_at")
    private LocalDateTime approvedAt;

    public enum DeliverableType {
        DOCUMENT,
        CODE,
        REPORT,
        PRESENTATION,
        OTHER
    }

    public enum DeliverableStatus {
        PENDING,
        IN_REVIEW,
        APPROVED,
        REJECTED
    }
}
