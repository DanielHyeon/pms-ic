package com.insuretech.pms.lineage.reactive.repository;

import com.insuretech.pms.lineage.reactive.entity.R2dbcOutboxEvent;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface ReactiveOutboxEventRepository extends ReactiveCrudRepository<R2dbcOutboxEvent, UUID> {

    Flux<R2dbcOutboxEvent> findByStatus(String status);

    Flux<R2dbcOutboxEvent> findByProjectId(String projectId);

    Flux<R2dbcOutboxEvent> findByAggregateTypeAndAggregateId(String aggregateType, String aggregateId);

    @Query("SELECT * FROM lineage.outbox_events WHERE status = 'PENDING' ORDER BY created_at LIMIT :limit")
    Flux<R2dbcOutboxEvent> findPendingEvents(int limit);

    @Query("SELECT * FROM lineage.outbox_events WHERE status = 'FAILED' AND retry_count < :maxRetries ORDER BY created_at LIMIT :limit")
    Flux<R2dbcOutboxEvent> findFailedEventsForRetry(int maxRetries, int limit);

    @Query("UPDATE lineage.outbox_events SET status = 'PUBLISHED', published_at = NOW() WHERE id = :id")
    Mono<Void> markPublished(UUID id);

    @Query("UPDATE lineage.outbox_events SET status = 'FAILED', last_error = :error, retry_count = retry_count + 1 WHERE id = :id")
    Mono<Void> markFailed(UUID id, String error);

    @Query("UPDATE lineage.outbox_events SET status = 'PENDING' WHERE id = :id")
    Mono<Void> resetForRetry(UUID id);

    Mono<R2dbcOutboxEvent> findByIdempotencyKey(String idempotencyKey);

    Mono<Long> countByStatus(String status);

    @Query("DELETE FROM lineage.outbox_events WHERE status = 'PUBLISHED' AND published_at < NOW() - INTERVAL ':days days'")
    Mono<Long> deleteOldPublishedEvents(int days);
}
