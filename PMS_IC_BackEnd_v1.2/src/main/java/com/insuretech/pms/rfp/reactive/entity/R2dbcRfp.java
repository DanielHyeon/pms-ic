package com.insuretech.pms.rfp.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
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
public class R2dbcRfp extends R2dbcBaseEntity implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    // save() 호출 시 INSERT/UPDATE 판단용 플래그
    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

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

    // --- New columns from V20260236_05 ---

    @Nullable
    @Column("origin_type")
    private String originType;

    @Nullable
    @Column("version_label")
    @Builder.Default
    private String versionLabel = "v1.0";

    @Nullable
    @Column("checksum")
    private String checksum;

    @Nullable
    @Column("previous_status")
    private String previousStatus;

    // failureReason = 사용자 친화 메시지 (토스트에 표시)
    @Nullable
    @Column("failure_reason")
    private String failureReason;

    // failureReasonDev = 개발자 디버그 메시지 (스택트레이스, 모델 응답 등)
    @Nullable
    @Column("failure_reason_dev")
    private String failureReasonDev;

    // 재시도 가능 여부 (UI에서 "다시 시도" 버튼 표시 제어)
    @Column("retryable")
    @Builder.Default
    private Boolean retryable = false;

    @Nullable
    @Column("source_name")
    private String sourceName;

    @Nullable
    @Column("rfp_type")
    private String rfpType;
}
