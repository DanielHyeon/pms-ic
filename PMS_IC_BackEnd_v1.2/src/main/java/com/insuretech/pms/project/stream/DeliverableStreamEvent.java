package com.insuretech.pms.project.stream;

import lombok.*;

import java.io.Serializable;

/**
 * Event object for Redis Streams.
 * Contains essential information for RAG indexing processing.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverableStreamEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Outbox event ID (for acknowledgment tracking)
     */
    private String eventId;

    /**
     * Deliverable ID (aggregate ID)
     */
    private String deliverableId;

    /**
     * Event type: DELIVERABLE_UPLOADED, DELIVERABLE_DELETED, etc.
     */
    private String eventType;

    /**
     * JSON payload containing event details
     */
    private String payload;

    /**
     * Project ID for partitioning
     */
    private String projectId;

    /**
     * RAG document ID
     */
    private String ragDocId;

    /**
     * Timestamp when the event was created
     */
    private String createdAt;

    /**
     * Retry count for tracking processing attempts
     */
    private Integer retryCount;
}
