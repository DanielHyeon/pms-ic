package com.insuretech.pms.project.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Table(name = "deliverable_outbox", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDeliverableOutbox {

    @Id
    @Column("id")
    private String id;

    @Column("aggregate_type")
    @Builder.Default
    private String aggregateType = "DELIVERABLE";

    @Column("aggregate_id")
    private String aggregateId;

    @Column("event_type")
    private String eventType;

    @Column("payload")
    private String payload;

    @Column("status")
    @Builder.Default
    private String status = "PENDING";

    @Nullable
    @Column("stream_id")
    private String streamId;

    @Column("retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column("max_retries")
    @Builder.Default
    private Integer maxRetries = 5;

    @Nullable
    @Column("next_retry_at")
    private LocalDateTime nextRetryAt;

    @Nullable
    @Column("last_error")
    private String lastError;

    @Nullable
    @Column("last_error_at")
    private LocalDateTime lastErrorAt;

    @Column("created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Nullable
    @Column("processed_at")
    private LocalDateTime processedAt;

    @Nullable
    @Column("relayed_at")
    private LocalDateTime relayedAt;

    @Nullable
    @Column("project_id")
    private String projectId;

    @Column("partition_date")
    @Builder.Default
    private LocalDate partitionDate = LocalDate.now();

    // Event type constants
    public static final String EVENT_DELIVERABLE_UPLOADED = "DELIVERABLE_UPLOADED";
    public static final String EVENT_DELIVERABLE_DELETED = "DELIVERABLE_DELETED";
    public static final String EVENT_DELIVERABLE_APPROVED = "DELIVERABLE_APPROVED";
    public static final String EVENT_DELIVERABLE_REJECTED = "DELIVERABLE_REJECTED";
    public static final String EVENT_DELIVERABLE_VERSION_UPDATED = "DELIVERABLE_VERSION_UPDATED";

    // Status constants
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PROCESSING = "PROCESSING";
    public static final String STATUS_PROCESSED = "PROCESSED";
    public static final String STATUS_RELAYED = "RELAYED";
    public static final String STATUS_FAILED = "FAILED";

    public enum EventType {
        DELIVERABLE_UPLOADED,
        DELIVERABLE_DELETED,
        DELIVERABLE_APPROVED,
        DELIVERABLE_REJECTED,
        DELIVERABLE_VERSION_UPDATED
    }

    public enum Status {
        PENDING,
        PROCESSING,
        PROCESSED,
        RELAYED,
        FAILED
    }
}
