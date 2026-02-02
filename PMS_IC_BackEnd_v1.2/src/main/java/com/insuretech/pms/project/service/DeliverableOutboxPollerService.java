package com.insuretech.pms.project.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.project.reactive.entity.R2dbcDeliverableOutbox;
import com.insuretech.pms.project.reactive.repository.ReactiveDeliverableOutboxRepository;
import com.insuretech.pms.rag.service.RAGIndexingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Poller service that processes outbox events for RAG indexing.
 * Runs on a scheduled basis and processes pending events.
 */
@Slf4j
@Service
public class DeliverableOutboxPollerService {

    private final DeliverableOutboxService outboxService;
    private final ReactiveDeliverableOutboxRepository outboxRepository;
    private final RAGIndexingService ragIndexingService;
    private final ObjectMapper objectMapper;

    @Value("${lineage.outbox.batch-size:100}")
    private int batchSize;

    @Value("${pms.storage.deliverables:uploads/deliverables}")
    private String deliverableStoragePath;

    @Value("${lineage.outbox.enabled:true}")
    private boolean pollerEnabled;

    private final AtomicBoolean isProcessing = new AtomicBoolean(false);

    public DeliverableOutboxPollerService(
            DeliverableOutboxService outboxService,
            ReactiveDeliverableOutboxRepository outboxRepository,
            RAGIndexingService ragIndexingService,
            ObjectMapper objectMapper
    ) {
        this.outboxService = outboxService;
        this.outboxRepository = outboxRepository;
        this.ragIndexingService = ragIndexingService;
        this.objectMapper = objectMapper;
    }

    /**
     * Scheduled polling job - runs every 5 seconds by default.
     * Configurable via lineage.outbox.poll-interval
     */
    @Scheduled(fixedDelayString = "${lineage.outbox.poll-interval:5000}")
    public void pollAndProcessEvents() {
        if (!pollerEnabled) {
            return;
        }

        // Prevent concurrent processing
        if (!isProcessing.compareAndSet(false, true)) {
            log.debug("Poller is already processing, skipping this cycle");
            return;
        }

        try {
            log.debug("Starting outbox polling cycle");

            outboxService.getPendingEvents(batchSize)
                    .flatMap(this::processEvent)
                    .doOnError(e -> log.error("Error in polling cycle", e))
                    .doFinally(signal -> {
                        isProcessing.set(false);
                        log.debug("Completed outbox polling cycle");
                    })
                    .subscribeOn(Schedulers.boundedElastic())
                    .subscribe();

        } catch (Exception e) {
            log.error("Fatal error in polling cycle", e);
            isProcessing.set(false);
        }
    }

    /**
     * Process a single outbox event
     */
    private Mono<Void> processEvent(R2dbcDeliverableOutbox event) {
        log.info("Processing event: {} type: {} for deliverable: {}",
                event.getId(), event.getEventType(), event.getAggregateId());

        // Mark as processing first
        return outboxRepository.markAsProcessing(event.getId())
                .flatMap(updated -> {
                    if (updated == 0) {
                        log.debug("Event {} already being processed", event.getId());
                        return Mono.empty();
                    }

                    return Mono.fromCallable(() -> processEventSync(event))
                            .subscribeOn(Schedulers.boundedElastic())
                            .flatMap(success -> {
                                if (success) {
                                    String ragDocId = "deliverable:" + event.getAggregateId();
                                    return outboxService.markEventProcessed(event.getId(), ragDocId);
                                } else {
                                    return outboxService.markEventFailed(
                                            event.getId(),
                                            "RAG indexing failed"
                                    );
                                }
                            })
                            .onErrorResume(e -> {
                                log.error("Error processing event: {}", event.getId(), e);
                                return outboxService.markEventFailed(event.getId(), e.getMessage());
                            });
                })
                .then();
    }

    /**
     * Synchronous event processing logic
     */
    private boolean processEventSync(R2dbcDeliverableOutbox event) {
        try {
            Map<String, Object> payload = parsePayload(event.getPayload());

            String eventType = event.getEventType();
            String deliverableId = event.getAggregateId();
            String ragDocId = "deliverable:" + deliverableId;

            switch (eventType) {
                case R2dbcDeliverableOutbox.EVENT_DELIVERABLE_UPLOADED:
                case R2dbcDeliverableOutbox.EVENT_DELIVERABLE_VERSION_UPDATED:
                    return handleUploadEvent(deliverableId, ragDocId, payload);

                case R2dbcDeliverableOutbox.EVENT_DELIVERABLE_DELETED:
                    return handleDeleteEvent(ragDocId);

                case R2dbcDeliverableOutbox.EVENT_DELIVERABLE_APPROVED:
                case R2dbcDeliverableOutbox.EVENT_DELIVERABLE_REJECTED:
                    // For approval/rejection, update metadata in RAG
                    return handleApprovalEvent(deliverableId, ragDocId, payload);

                default:
                    log.warn("Unknown event type: {}", eventType);
                    return false;
            }

        } catch (Exception e) {
            log.error("Error processing event sync: {}", event.getId(), e);
            return false;
        }
    }

    /**
     * Handle deliverable upload - index file to RAG
     */
    private boolean handleUploadEvent(String deliverableId, String ragDocId, Map<String, Object> payload) {
        String fileName = (String) payload.get("file_name");
        if (fileName == null) {
            log.error("No file_name in payload for deliverable: {}", deliverableId);
            return false;
        }

        // Build file path
        Path filePath = Paths.get(deliverableStoragePath, deliverableId, fileName);

        // Build metadata
        Map<String, String> metadata = new HashMap<>();
        metadata.put("deliverable_id", deliverableId);
        metadata.put("source", "deliverable");

        if (payload.get("name") != null) {
            metadata.put("name", (String) payload.get("name"));
        }
        if (payload.get("type") != null) {
            metadata.put("type", (String) payload.get("type"));
        }
        if (payload.get("phase_id") != null) {
            metadata.put("phase_id", (String) payload.get("phase_id"));
        }
        if (payload.get("uploaded_by") != null) {
            metadata.put("uploaded_by", (String) payload.get("uploaded_by"));
        }
        if (payload.get("description") != null) {
            metadata.put("description", (String) payload.get("description"));
        }

        // Index to RAG
        log.info("Indexing file to RAG: {} as {}", filePath, ragDocId);
        return ragIndexingService.indexFile(ragDocId, filePath, metadata);
    }

    /**
     * Handle deliverable deletion - remove from RAG
     */
    private boolean handleDeleteEvent(String ragDocId) {
        log.info("Deleting document from RAG: {}", ragDocId);
        return ragIndexingService.deleteDocument(ragDocId);
    }

    /**
     * Handle deliverable approval - update metadata in RAG
     */
    private boolean handleApprovalEvent(String deliverableId, String ragDocId, Map<String, Object> payload) {
        log.info("Processing approval event for: {}", ragDocId);

        // Build metadata update from payload
        Map<String, Object> metadataUpdate = new HashMap<>();

        // Status update
        if (payload.get("status") != null) {
            metadataUpdate.put("status", payload.get("status"));
        }

        // Approver info
        if (payload.get("approver") != null) {
            metadataUpdate.put("approver", payload.get("approver"));
        }

        // Approval timestamp
        if (payload.get("approved_at") != null) {
            metadataUpdate.put("approved_at", payload.get("approved_at"));
        }

        // Access level might change on approval (e.g., approved docs more widely accessible)
        if (payload.get("access_level") != null) {
            metadataUpdate.put("access_level", payload.get("access_level"));
        }

        if (metadataUpdate.isEmpty()) {
            log.warn("No metadata to update for approval event: {}", ragDocId);
            return true; // Consider success if nothing to update
        }

        // Call RAG service to update metadata
        return ragIndexingService.updateDocumentMetadata(ragDocId, metadataUpdate);
    }

    /**
     * Parse JSON payload
     */
    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.error("Failed to parse payload: {}", payloadJson, e);
            return new HashMap<>();
        }
    }

    /**
     * Manual trigger for processing (useful for testing)
     */
    public Mono<Long> triggerProcessing() {
        return outboxService.getPendingEvents(batchSize)
                .flatMap(this::processEvent)
                .count()
                .doOnSuccess(count -> log.info("Manually processed {} events", count));
    }

    /**
     * Get current poller status
     */
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", pollerEnabled);
        status.put("processing", isProcessing.get());
        status.put("batchSize", batchSize);
        status.put("lastCheck", LocalDateTime.now().toString());
        return status;
    }
}
