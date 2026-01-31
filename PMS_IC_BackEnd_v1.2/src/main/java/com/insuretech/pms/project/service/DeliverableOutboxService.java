package com.insuretech.pms.project.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.project.reactive.entity.R2dbcDeliverable;
import com.insuretech.pms.project.reactive.entity.R2dbcDeliverableOutbox;
import com.insuretech.pms.project.reactive.entity.R2dbcDeliverableOutboxDeadLetter;
import com.insuretech.pms.project.reactive.repository.ReactiveDeliverableOutboxDeadLetterRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveDeliverableOutboxRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveDeliverableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Service for managing Deliverable RAG indexing outbox events.
 * Implements the Transactional Outbox Pattern for reliable event delivery.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeliverableOutboxService {

    private final ReactiveDeliverableOutboxRepository outboxRepository;
    private final ReactiveDeliverableOutboxDeadLetterRepository deadLetterRepository;
    private final ReactiveDeliverableRepository deliverableRepository;
    private final ObjectMapper objectMapper;

    /**
     * Create outbox event for deliverable upload (within same transaction as deliverable creation).
     * This ensures atomic creation of deliverable and RAG indexing event.
     */
    @Transactional
    public Mono<R2dbcDeliverableOutbox> createUploadEvent(R2dbcDeliverable deliverable, String projectId) {
        return outboxRepository.existsPendingEvent(
                deliverable.getId(),
                R2dbcDeliverableOutbox.EVENT_DELIVERABLE_UPLOADED
        ).flatMap(exists -> {
            if (exists) {
                log.debug("Upload event already exists for deliverable: {}", deliverable.getId());
                return outboxRepository.findByAggregateId(deliverable.getId())
                        .filter(e -> R2dbcDeliverableOutbox.EVENT_DELIVERABLE_UPLOADED.equals(e.getEventType()))
                        .next();
            }
            return createOutboxEvent(deliverable, R2dbcDeliverableOutbox.EVENT_DELIVERABLE_UPLOADED, projectId);
        });
    }

    /**
     * Create outbox event for deliverable deletion
     */
    @Transactional
    public Mono<R2dbcDeliverableOutbox> createDeleteEvent(String deliverableId, String projectId) {
        return outboxRepository.existsPendingEvent(
                deliverableId,
                R2dbcDeliverableOutbox.EVENT_DELIVERABLE_DELETED
        ).flatMap(exists -> {
            if (exists) {
                log.debug("Delete event already exists for deliverable: {}", deliverableId);
                return outboxRepository.findByAggregateId(deliverableId)
                        .filter(e -> R2dbcDeliverableOutbox.EVENT_DELIVERABLE_DELETED.equals(e.getEventType()))
                        .next();
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("deliverable_id", deliverableId);
            payload.put("rag_doc_id", "deliverable:" + deliverableId);
            payload.put("deleted_at", LocalDateTime.now().toString());

            return createOutboxEventWithPayload(
                    deliverableId,
                    R2dbcDeliverableOutbox.EVENT_DELIVERABLE_DELETED,
                    payload,
                    projectId
            );
        });
    }

    /**
     * Create outbox event for deliverable approval
     */
    @Transactional
    public Mono<R2dbcDeliverableOutbox> createApprovalEvent(R2dbcDeliverable deliverable, String projectId) {
        return outboxRepository.existsPendingEvent(
                deliverable.getId(),
                R2dbcDeliverableOutbox.EVENT_DELIVERABLE_APPROVED
        ).flatMap(exists -> {
            if (exists) {
                log.debug("Approval event already exists for deliverable: {}", deliverable.getId());
                return outboxRepository.findByAggregateId(deliverable.getId())
                        .filter(e -> R2dbcDeliverableOutbox.EVENT_DELIVERABLE_APPROVED.equals(e.getEventType()))
                        .next();
            }
            return createOutboxEvent(deliverable, R2dbcDeliverableOutbox.EVENT_DELIVERABLE_APPROVED, projectId);
        });
    }

    /**
     * Create outbox event for deliverable rejection
     */
    @Transactional
    public Mono<R2dbcDeliverableOutbox> createRejectionEvent(R2dbcDeliverable deliverable, String projectId) {
        return outboxRepository.existsPendingEvent(
                deliverable.getId(),
                R2dbcDeliverableOutbox.EVENT_DELIVERABLE_REJECTED
        ).flatMap(exists -> {
            if (exists) {
                log.debug("Rejection event already exists for deliverable: {}", deliverable.getId());
                return outboxRepository.findByAggregateId(deliverable.getId())
                        .filter(e -> R2dbcDeliverableOutbox.EVENT_DELIVERABLE_REJECTED.equals(e.getEventType()))
                        .next();
            }
            return createOutboxEvent(deliverable, R2dbcDeliverableOutbox.EVENT_DELIVERABLE_REJECTED, projectId);
        });
    }

    /**
     * Create outbox event for deliverable version update
     */
    @Transactional
    public Mono<R2dbcDeliverableOutbox> createVersionUpdateEvent(R2dbcDeliverable deliverable, String projectId) {
        // Version updates can have multiple events
        return createOutboxEvent(deliverable, R2dbcDeliverableOutbox.EVENT_DELIVERABLE_VERSION_UPDATED, projectId);
    }

    /**
     * Mark event as processed and update deliverable RAG status
     */
    @Transactional
    public Mono<Void> markEventProcessed(String eventId, String ragDocId) {
        LocalDateTime now = LocalDateTime.now();

        return outboxRepository.findById(eventId)
                .flatMap(event -> {
                    // Update outbox event status
                    Mono<Integer> updateOutbox = outboxRepository.markAsProcessed(eventId, now);

                    // Update deliverable RAG status
                    Mono<R2dbcDeliverable> updateDeliverable = deliverableRepository
                            .findById(event.getAggregateId())
                            .flatMap(deliverable -> {
                                deliverable.setRagStatus(R2dbcDeliverable.RagStatus.READY.name());
                                deliverable.setRagDocId(ragDocId);
                                deliverable.setRagUpdatedAt(now);
                                deliverable.setRagLastError(null);
                                return deliverableRepository.save(deliverable);
                            });

                    return Mono.when(updateOutbox, updateDeliverable);
                })
                .doOnSuccess(v -> log.info("Event processed successfully: {}", eventId))
                .then();
    }

    /**
     * Mark event as failed with retry scheduling
     */
    @Transactional
    public Mono<Void> markEventFailed(String eventId, String error) {
        LocalDateTime now = LocalDateTime.now();

        return outboxRepository.findById(eventId)
                .flatMap(event -> {
                    int currentRetryCount = event.getRetryCount() != null ? event.getRetryCount() : 0;
                    int maxRetries = event.getMaxRetries() != null ? event.getMaxRetries() : 5;

                    if (currentRetryCount >= maxRetries - 1) {
                        // Move to dead letter
                        return moveToDeadLetter(event, error);
                    }

                    // Calculate exponential backoff: 2^retry * 30 seconds
                    long backoffSeconds = (long) Math.pow(2, currentRetryCount) * 30;
                    LocalDateTime nextRetry = now.plusSeconds(backoffSeconds);

                    // Update outbox with retry info
                    Mono<Integer> updateOutbox = outboxRepository.markAsFailedWithRetry(
                            eventId, error, now, nextRetry
                    );

                    // Update deliverable RAG status to indicate failure
                    Mono<R2dbcDeliverable> updateDeliverable = deliverableRepository
                            .findById(event.getAggregateId())
                            .flatMap(deliverable -> {
                                deliverable.setRagStatus(R2dbcDeliverable.RagStatus.FAILED.name());
                                deliverable.setRagLastError(error);
                                deliverable.setRagUpdatedAt(now);
                                return deliverableRepository.save(deliverable);
                            });

                    return Mono.when(updateOutbox, updateDeliverable);
                })
                .doOnSuccess(v -> log.warn("Event marked as failed with retry: {}, error: {}", eventId, error))
                .then();
    }

    /**
     * Move permanently failed event to dead letter table
     */
    @Transactional
    public Mono<Void> moveToDeadLetter(R2dbcDeliverableOutbox event, String lastError) {
        LocalDateTime now = LocalDateTime.now();

        // Build error history JSON
        String errorHistory = buildErrorHistory(lastError, now);

        R2dbcDeliverableOutboxDeadLetter deadLetter = R2dbcDeliverableOutboxDeadLetter.builder()
                .id(event.getId())
                .aggregateType(event.getAggregateType())
                .aggregateId(event.getAggregateId())
                .eventType(event.getEventType())
                .payload(event.getPayload())
                .streamId(event.getStreamId())
                .errorHistory(errorHistory)
                .deliveryCount(event.getRetryCount() != null ? event.getRetryCount() + 1 : 1)
                .createdAt(event.getCreatedAt())
                .movedAt(now)
                .projectId(event.getProjectId())
                .build();

        return deadLetterRepository.save(deadLetter)
                .flatMap(saved -> outboxRepository.deleteById(event.getId()))
                .flatMap(v -> {
                    // Update deliverable RAG status
                    return deliverableRepository.findById(event.getAggregateId())
                            .flatMap(deliverable -> {
                                deliverable.setRagStatus(R2dbcDeliverable.RagStatus.FAILED.name());
                                deliverable.setRagLastError("Moved to dead letter: " + lastError);
                                deliverable.setRagUpdatedAt(now);
                                return deliverableRepository.save(deliverable);
                            });
                })
                .doOnSuccess(v -> log.error("Event moved to dead letter: {}, reason: {}", event.getId(), lastError))
                .then();
    }

    /**
     * Get pending events for processing
     */
    public Flux<R2dbcDeliverableOutbox> getPendingEvents(int limit) {
        return outboxRepository.findPendingEventsForProcessing(LocalDateTime.now(), limit);
    }

    /**
     * Get events ready for retry
     */
    public Flux<R2dbcDeliverableOutbox> getEventsForRetry(int limit) {
        return outboxRepository.findEventsForRetry(LocalDateTime.now(), limit);
    }

    /**
     * Get dead letter events (unresolved)
     */
    public Flux<R2dbcDeliverableOutboxDeadLetter> getUnresolvedDeadLetters(int limit) {
        return deadLetterRepository.findUnresolvedEvents(limit);
    }

    /**
     * Retry a dead letter event
     */
    @Transactional
    public Mono<R2dbcDeliverableOutbox> retryDeadLetter(String deadLetterId, String retryUser) {
        return deadLetterRepository.findById(deadLetterId)
                .flatMap(deadLetter -> {
                    // Mark dead letter as retrying
                    return deadLetterRepository.markAsRetrying(
                            deadLetterId, retryUser, LocalDateTime.now()
                    ).then(Mono.just(deadLetter));
                })
                .flatMap(deadLetter -> {
                    // Create new outbox event
                    R2dbcDeliverableOutbox newEvent = R2dbcDeliverableOutbox.builder()
                            .id(UUID.randomUUID().toString())
                            .aggregateType(deadLetter.getAggregateType())
                            .aggregateId(deadLetter.getAggregateId())
                            .eventType(deadLetter.getEventType())
                            .payload(deadLetter.getPayload())
                            .status(R2dbcDeliverableOutbox.STATUS_PENDING)
                            .retryCount(0)
                            .maxRetries(3) // Reduced retries for manual retry
                            .projectId(deadLetter.getProjectId())
                            .build();

                    return outboxRepository.save(newEvent);
                })
                .doOnSuccess(event -> log.info("Dead letter {} retried by {}, new event: {}",
                        deadLetterId, retryUser, event.getId()));
    }

    /**
     * Get outbox statistics
     */
    public Mono<Map<String, Long>> getStatistics() {
        return Mono.zip(
                outboxRepository.countByStatus(R2dbcDeliverableOutbox.STATUS_PENDING),
                outboxRepository.countByStatus(R2dbcDeliverableOutbox.STATUS_PROCESSING),
                outboxRepository.countByStatus(R2dbcDeliverableOutbox.STATUS_PROCESSED),
                outboxRepository.countByStatus(R2dbcDeliverableOutbox.STATUS_FAILED),
                deadLetterRepository.countUnresolved()
        ).map(tuple -> {
            Map<String, Long> stats = new HashMap<>();
            stats.put("pending", tuple.getT1());
            stats.put("processing", tuple.getT2());
            stats.put("processed", tuple.getT3());
            stats.put("failed", tuple.getT4());
            stats.put("deadLetter", tuple.getT5());
            return stats;
        });
    }

    // Private helper methods

    private Mono<R2dbcDeliverableOutbox> createOutboxEvent(
            R2dbcDeliverable deliverable,
            String eventType,
            String projectId
    ) {
        Map<String, Object> payload = buildPayload(deliverable, eventType);
        return createOutboxEventWithPayload(deliverable.getId(), eventType, payload, projectId);
    }

    private Mono<R2dbcDeliverableOutbox> createOutboxEventWithPayload(
            String aggregateId,
            String eventType,
            Map<String, Object> payload,
            String projectId
    ) {
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            return Mono.error(new RuntimeException("Failed to serialize payload", e));
        }

        R2dbcDeliverableOutbox event = R2dbcDeliverableOutbox.builder()
                .id(UUID.randomUUID().toString())
                .aggregateId(aggregateId)
                .eventType(eventType)
                .payload(payloadJson)
                .projectId(projectId)
                .build();

        return outboxRepository.save(event)
                .doOnSuccess(e -> log.info("Created outbox event: {} for deliverable: {}",
                        eventType, aggregateId));
    }

    private Map<String, Object> buildPayload(R2dbcDeliverable deliverable, String eventType) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("deliverable_id", deliverable.getId());
        payload.put("rag_doc_id", "deliverable:" + deliverable.getId());
        payload.put("name", deliverable.getName());
        payload.put("file_name", deliverable.getFileName());
        payload.put("file_size", deliverable.getFileSize());
        payload.put("type", deliverable.getType());
        payload.put("phase_id", deliverable.getPhaseId());
        payload.put("uploaded_by", deliverable.getUploadedBy());
        payload.put("event_type", eventType);
        payload.put("event_time", LocalDateTime.now().toString());

        if (deliverable.getDescription() != null) {
            payload.put("description", deliverable.getDescription());
        }
        if (deliverable.getApprover() != null) {
            payload.put("approver", deliverable.getApprover());
        }
        if (deliverable.getApprovedAt() != null) {
            payload.put("approved_at", deliverable.getApprovedAt().toString());
        }
        // Include status for approval/rejection events
        if (deliverable.getStatus() != null) {
            payload.put("status", deliverable.getStatus());
        }

        return payload;
    }

    private String buildErrorHistory(String lastError, LocalDateTime errorAt) {
        try {
            Map<String, String> errorEntry = new HashMap<>();
            errorEntry.put("error", lastError);
            errorEntry.put("at", errorAt.toString());
            return objectMapper.writeValueAsString(new Object[]{errorEntry});
        } catch (JsonProcessingException e) {
            return "[{\"error\": \"" + lastError + "\", \"at\": \"" + errorAt + "\"}]";
        }
    }
}
