package com.insuretech.pms.project.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "deliverable_outbox_dead_letter", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDeliverableOutboxDeadLetter {

    @Id
    @Column("id")
    private String id;

    @Column("aggregate_type")
    private String aggregateType;

    @Column("aggregate_id")
    private String aggregateId;

    @Column("event_type")
    private String eventType;

    @Column("payload")
    private String payload;

    @Nullable
    @Column("stream_id")
    private String streamId;

    @Nullable
    @Column("error_history")
    private String errorHistory;

    @Nullable
    @Column("delivery_count")
    private Integer deliveryCount;

    @Nullable
    @Column("created_at")
    private LocalDateTime createdAt;

    @Column("moved_at")
    @Builder.Default
    private LocalDateTime movedAt = LocalDateTime.now();

    @Nullable
    @Column("project_id")
    private String projectId;

    @Column("resolution_status")
    @Builder.Default
    private String resolutionStatus = "UNRESOLVED";

    @Nullable
    @Column("resolution_notes")
    private String resolutionNotes;

    @Nullable
    @Column("resolved_by")
    private String resolvedBy;

    @Nullable
    @Column("resolved_at")
    private LocalDateTime resolvedAt;

    // Resolution status constants
    public static final String RESOLUTION_UNRESOLVED = "UNRESOLVED";
    public static final String RESOLUTION_RETRYING = "RETRYING";
    public static final String RESOLUTION_RESOLVED = "RESOLVED";
    public static final String RESOLUTION_IGNORED = "IGNORED";

    public enum ResolutionStatus {
        UNRESOLVED,
        RETRYING,
        RESOLVED,
        IGNORED
    }
}
