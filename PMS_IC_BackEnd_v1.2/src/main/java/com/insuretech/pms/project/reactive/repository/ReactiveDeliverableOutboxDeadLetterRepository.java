package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcDeliverableOutboxDeadLetter;
import org.springframework.data.r2dbc.repository.Modifying;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

@Repository
public interface ReactiveDeliverableOutboxDeadLetterRepository
        extends ReactiveCrudRepository<R2dbcDeliverableOutboxDeadLetter, String> {

    /**
     * Find unresolved dead letter events
     */
    Flux<R2dbcDeliverableOutboxDeadLetter> findByResolutionStatus(String resolutionStatus);

    /**
     * Find dead letter events by project
     */
    Flux<R2dbcDeliverableOutboxDeadLetter> findByProjectIdOrderByMovedAtDesc(String projectId);

    /**
     * Find dead letter events by aggregate
     */
    Flux<R2dbcDeliverableOutboxDeadLetter> findByAggregateId(String aggregateId);

    /**
     * Find unresolved events ordered by move time
     */
    @Query("""
        SELECT * FROM project.deliverable_outbox_dead_letter
        WHERE resolution_status = 'UNRESOLVED'
        ORDER BY moved_at DESC
        LIMIT :limit
        """)
    Flux<R2dbcDeliverableOutboxDeadLetter> findUnresolvedEvents(int limit);

    /**
     * Count unresolved events
     */
    @Query("""
        SELECT COUNT(*) FROM project.deliverable_outbox_dead_letter
        WHERE resolution_status = 'UNRESOLVED'
        """)
    Mono<Long> countUnresolved();

    /**
     * Mark as retrying
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox_dead_letter
        SET resolution_status = 'RETRYING',
            resolved_by = :resolvedBy,
            resolved_at = :resolvedAt
        WHERE id = :id AND resolution_status = 'UNRESOLVED'
        """)
    Mono<Integer> markAsRetrying(String id, String resolvedBy, LocalDateTime resolvedAt);

    /**
     * Mark as resolved
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox_dead_letter
        SET resolution_status = 'RESOLVED',
            resolution_notes = :notes,
            resolved_by = :resolvedBy,
            resolved_at = :resolvedAt
        WHERE id = :id
        """)
    Mono<Integer> markAsResolved(String id, String notes, String resolvedBy, LocalDateTime resolvedAt);

    /**
     * Mark as ignored
     */
    @Modifying
    @Query("""
        UPDATE project.deliverable_outbox_dead_letter
        SET resolution_status = 'IGNORED',
            resolution_notes = :notes,
            resolved_by = :resolvedBy,
            resolved_at = :resolvedAt
        WHERE id = :id
        """)
    Mono<Integer> markAsIgnored(String id, String notes, String resolvedBy, LocalDateTime resolvedAt);

    /**
     * Delete old resolved events
     */
    @Modifying
    @Query("""
        DELETE FROM project.deliverable_outbox_dead_letter
        WHERE resolution_status IN ('RESOLVED', 'IGNORED')
          AND resolved_at < :cutoffDate
        """)
    Mono<Long> deleteOldResolvedEvents(LocalDateTime cutoffDate);
}
