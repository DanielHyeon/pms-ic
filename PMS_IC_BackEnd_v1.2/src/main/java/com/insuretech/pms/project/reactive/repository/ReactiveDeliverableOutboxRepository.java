package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcDeliverableOutbox;
import org.springframework.data.r2dbc.repository.Modifying;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

@Repository
public interface ReactiveDeliverableOutboxRepository extends ReactiveCrudRepository<R2dbcDeliverableOutbox, String> {

    Flux<R2dbcDeliverableOutbox> findByStatus(String status);

    Flux<R2dbcDeliverableOutbox> findByProjectId(String projectId);

    Flux<R2dbcDeliverableOutbox> findByAggregateId(String aggregateId);

    /**
     * Find pending events ready for processing (PENDING or retry-ready)
     */
    @Query("""
        SELECT * FROM project.deliverable_outbox
        WHERE status = 'PENDING'
           OR (status = 'PROCESSING' AND next_retry_at <= :now)
        ORDER BY created_at ASC
        LIMIT :limit
        FOR UPDATE SKIP LOCKED
        """)
    Flux<R2dbcDeliverableOutbox> findPendingEventsForProcessing(LocalDateTime now, int limit);

    /**
     * Find pending events without lock (for monitoring)
     */
    @Query("""
        SELECT * FROM project.deliverable_outbox
        WHERE status IN ('PENDING', 'PROCESSING')
        ORDER BY created_at ASC
        LIMIT :limit
        """)
    Flux<R2dbcDeliverableOutbox> findPendingEvents(int limit);

    /**
     * Find failed events eligible for retry
     */
    @Query("""
        SELECT * FROM project.deliverable_outbox
        WHERE status = 'PROCESSING'
          AND next_retry_at <= :now
          AND retry_count < max_retries
        ORDER BY next_retry_at ASC
        LIMIT :limit
        """)
    Flux<R2dbcDeliverableOutbox> findEventsForRetry(LocalDateTime now, int limit);

    /**
     * Find events that exceeded max retries (for dead letter move)
     */
    @Query("""
        SELECT * FROM project.deliverable_outbox
        WHERE status = 'PROCESSING'
          AND retry_count >= max_retries
        """)
    Flux<R2dbcDeliverableOutbox> findEventsExceededMaxRetries();

    /**
     * Mark event as processing
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox
        SET status = 'PROCESSING'
        WHERE id = :id AND status = 'PENDING'
        """)
    Mono<Integer> markAsProcessing(String id);

    /**
     * Mark event as processed
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox
        SET status = 'PROCESSED',
            processed_at = :processedAt
        WHERE id = :id
        """)
    Mono<Integer> markAsProcessed(String id, LocalDateTime processedAt);

    /**
     * Mark event as failed with retry scheduling
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox
        SET status = 'PROCESSING',
            retry_count = retry_count + 1,
            last_error = :error,
            last_error_at = :errorAt,
            next_retry_at = :nextRetryAt
        WHERE id = :id
        """)
    Mono<Integer> markAsFailedWithRetry(String id, String error, LocalDateTime errorAt, LocalDateTime nextRetryAt);

    /**
     * Mark event as permanently failed (max retries exceeded)
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox
        SET status = 'FAILED',
            last_error = :error,
            last_error_at = :errorAt
        WHERE id = :id
        """)
    Mono<Integer> markAsFailed(String id, String error, LocalDateTime errorAt);

    /**
     * Count events by status
     */
    Mono<Long> countByStatus(String status);

    /**
     * Delete old processed events
     */
    @Modifying
    @Query("""
        DELETE FROM project.deliverable_outbox
        WHERE status = 'PROCESSED'
          AND processed_at < :cutoffDate
        """)
    Mono<Long> deleteOldProcessedEvents(LocalDateTime cutoffDate);

    /**
     * Check if event already exists for aggregate (idempotency)
     */
    @Query("""
        SELECT EXISTS(
            SELECT 1 FROM project.deliverable_outbox
            WHERE aggregate_id = :aggregateId
              AND event_type = :eventType
              AND status IN ('PENDING', 'PROCESSING')
        )
        """)
    Mono<Boolean> existsPendingEvent(String aggregateId, String eventType);

    /**
     * Mark event as relayed to Redis Streams
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox
        SET status = 'RELAYED',
            stream_id = :streamId,
            relayed_at = :relayedAt
        WHERE id = :id AND status = 'PENDING'
        """)
    Mono<Integer> markAsRelayed(String id, String streamId, LocalDateTime relayedAt);

    /**
     * Find relayed events not yet processed (for recovery)
     */
    @Query("""
        SELECT * FROM project.deliverable_outbox
        WHERE status = 'RELAYED'
          AND relayed_at < :cutoffTime
        ORDER BY relayed_at ASC
        LIMIT :limit
        """)
    Flux<R2dbcDeliverableOutbox> findStaleRelayedEvents(LocalDateTime cutoffTime, int limit);
}
