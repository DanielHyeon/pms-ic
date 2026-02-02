package com.insuretech.pms.lineage.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;
import java.util.UUID;

@Table(name = "outbox_events", schema = "lineage")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcOutboxEvent {

    @Id
    @Column("id")
    private UUID id;

    @Column("event_type")
    private String eventType;

    @Column("aggregate_type")
    private String aggregateType;

    @Column("aggregate_id")
    private String aggregateId;

    @Nullable
    @Column("project_id")
    private String projectId;

    // JSON payload stored as String
    @Column("payload")
    private String payload;

    @Column("status")
    @Builder.Default
    private String status = "PENDING";

    @Column("created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Nullable
    @Column("published_at")
    private LocalDateTime publishedAt;

    @Column("retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Nullable
    @Column("last_error")
    private String lastError;

    @Nullable
    @Column("idempotency_key")
    private String idempotencyKey;
}
