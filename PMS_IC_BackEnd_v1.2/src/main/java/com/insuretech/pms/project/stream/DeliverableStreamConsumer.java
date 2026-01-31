package com.insuretech.pms.project.stream;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.project.service.DeliverableOutboxService;
import com.insuretech.pms.rag.service.RAGIndexingService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.stream.StreamReceiver;
import org.springframework.stereotype.Service;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.net.InetAddress;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Consumes deliverable events from Redis Streams and processes them for RAG indexing.
 *
 * Uses consumer groups for:
 * - Distributed processing across multiple instances
 * - Automatic message acknowledgment
 * - Pending message recovery for failed consumers
 */
@Slf4j
@Service
public class DeliverableStreamConsumer {

    private final ReactiveRedisTemplate<String, Object> redisTemplate;
    private final DeliverableOutboxService outboxService;
    private final RAGIndexingService ragIndexingService;
    private final DeliverableStreamPublisher streamPublisher;
    private final ObjectMapper objectMapper;

    @Value("${lineage.redis.stream.enabled:true}")
    private boolean streamEnabled;

    @Value("${lineage.redis.stream.poll-timeout:2000}")
    private long pollTimeoutMs;

    @Value("${pms.storage.deliverables:uploads/deliverables}")
    private String deliverableStoragePath;

    private Disposable subscription;
    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private String consumerId;

    public DeliverableStreamConsumer(
            ReactiveRedisTemplate<String, Object> redisTemplate,
            DeliverableOutboxService outboxService,
            RAGIndexingService ragIndexingService,
            DeliverableStreamPublisher streamPublisher,
            ObjectMapper objectMapper
    ) {
        this.redisTemplate = redisTemplate;
        this.outboxService = outboxService;
        this.ragIndexingService = ragIndexingService;
        this.streamPublisher = streamPublisher;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        if (!streamEnabled) {
            log.info("Redis Streams consumer is disabled");
            return;
        }

        try {
            consumerId = InetAddress.getLocalHost().getHostName() + "-" + ProcessHandle.current().pid();
        } catch (Exception e) {
            consumerId = "consumer-" + System.currentTimeMillis();
        }

        // Ensure consumer group exists and start consuming
        streamPublisher.ensureConsumerGroup()
                .doOnSuccess(result -> startConsuming())
                .doOnError(e -> log.error("Failed to initialize stream consumer", e))
                .subscribe();
    }

    @PreDestroy
    public void shutdown() {
        isRunning.set(false);
        if (subscription != null && !subscription.isDisposed()) {
            subscription.dispose();
            log.info("Stream consumer shutdown complete");
        }
    }

    /**
     * Start consuming messages from the stream.
     */
    private void startConsuming() {
        if (!isRunning.compareAndSet(false, true)) {
            log.debug("Consumer is already running");
            return;
        }

        log.info("Starting Redis Streams consumer: {} in group: {}",
                consumerId, RedisStreamConfig.CONSUMER_GROUP);

        StreamReceiver.StreamReceiverOptions<String, ObjectRecord<String, DeliverableStreamEvent>> options =
                StreamReceiver.StreamReceiverOptions.builder()
                        .pollTimeout(Duration.ofMillis(pollTimeoutMs))
                        .batchSize(10)
                        .targetType(DeliverableStreamEvent.class)
                        .build();

        StreamReceiver<String, ObjectRecord<String, DeliverableStreamEvent>> receiver =
                StreamReceiver.create(redisTemplate.getConnectionFactory(), options);

        Consumer consumer = Consumer.from(RedisStreamConfig.CONSUMER_GROUP, consumerId);
        StreamOffset<String> offset = StreamOffset.create(
                RedisStreamConfig.DELIVERABLE_STREAM_KEY,
                ReadOffset.lastConsumed()
        );

        subscription = receiver.receive(consumer, offset)
                .flatMap(record -> processRecord(record)
                        .then(acknowledgeRecord(record))
                        .onErrorResume(e -> {
                            log.error("Error processing record {}: {}", record.getId(), e.getMessage());
                            return Mono.empty();
                        }))
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe();
    }

    /**
     * Process a single stream record.
     */
    private Mono<Boolean> processRecord(ObjectRecord<String, DeliverableStreamEvent> record) {
        DeliverableStreamEvent event = record.getValue();
        log.info("Processing stream event: {} type: {} for deliverable: {}",
                event.getEventId(), event.getEventType(), event.getDeliverableId());

        return Mono.fromCallable(() -> processEventSync(event))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(success -> {
                    if (success) {
                        return outboxService.markEventProcessed(event.getEventId(), event.getRagDocId())
                                .thenReturn(true);
                    } else {
                        return outboxService.markEventFailed(event.getEventId(), "RAG indexing failed")
                                .thenReturn(false);
                    }
                })
                .onErrorResume(e -> {
                    log.error("Error processing event: {}", event.getEventId(), e);
                    return outboxService.markEventFailed(event.getEventId(), e.getMessage())
                            .thenReturn(false);
                });
    }

    /**
     * Acknowledge the record after processing.
     */
    private Mono<Long> acknowledgeRecord(ObjectRecord<String, DeliverableStreamEvent> record) {
        return redisTemplate.opsForStream()
                .acknowledge(
                        RedisStreamConfig.DELIVERABLE_STREAM_KEY,
                        RedisStreamConfig.CONSUMER_GROUP,
                        record.getId()
                )
                .doOnSuccess(count -> log.debug("Acknowledged record: {}", record.getId()));
    }

    /**
     * Synchronous event processing logic.
     */
    private boolean processEventSync(DeliverableStreamEvent event) {
        try {
            Map<String, Object> payload = parsePayload(event.getPayload());

            String eventType = event.getEventType();
            String deliverableId = event.getDeliverableId();
            String ragDocId = event.getRagDocId();

            return switch (eventType) {
                case "DELIVERABLE_UPLOADED", "DELIVERABLE_VERSION_UPDATED" ->
                        handleUploadEvent(deliverableId, ragDocId, payload);
                case "DELIVERABLE_DELETED" ->
                        handleDeleteEvent(ragDocId);
                case "DELIVERABLE_APPROVED", "DELIVERABLE_REJECTED" ->
                        handleApprovalEvent(deliverableId, ragDocId, payload);
                default -> {
                    log.warn("Unknown event type: {}", eventType);
                    yield false;
                }
            };
        } catch (Exception e) {
            log.error("Error processing event sync: {}", event.getEventId(), e);
            return false;
        }
    }

    private boolean handleUploadEvent(String deliverableId, String ragDocId, Map<String, Object> payload) {
        String fileName = (String) payload.get("file_name");
        if (fileName == null) {
            log.error("No file_name in payload for deliverable: {}", deliverableId);
            return false;
        }

        Path filePath = Paths.get(deliverableStoragePath, deliverableId, fileName);

        Map<String, String> metadata = new HashMap<>();
        metadata.put("deliverable_id", deliverableId);
        metadata.put("source", "deliverable");

        if (payload.get("name") != null) metadata.put("name", (String) payload.get("name"));
        if (payload.get("type") != null) metadata.put("type", (String) payload.get("type"));
        if (payload.get("phase_id") != null) metadata.put("phase_id", (String) payload.get("phase_id"));
        if (payload.get("uploaded_by") != null) metadata.put("uploaded_by", (String) payload.get("uploaded_by"));

        log.info("Indexing file to RAG via stream: {} as {}", filePath, ragDocId);
        return ragIndexingService.indexFile(ragDocId, filePath, metadata);
    }

    private boolean handleDeleteEvent(String ragDocId) {
        log.info("Deleting document from RAG via stream: {}", ragDocId);
        return ragIndexingService.deleteDocument(ragDocId);
    }

    private boolean handleApprovalEvent(String deliverableId, String ragDocId, Map<String, Object> payload) {
        log.info("Processing approval event via stream for: {}", ragDocId);

        Map<String, Object> metadataUpdate = new HashMap<>();
        if (payload.get("status") != null) metadataUpdate.put("status", payload.get("status"));
        if (payload.get("approver") != null) metadataUpdate.put("approver", payload.get("approver"));
        if (payload.get("approved_at") != null) metadataUpdate.put("approved_at", payload.get("approved_at"));
        if (payload.get("access_level") != null) metadataUpdate.put("access_level", payload.get("access_level"));

        if (metadataUpdate.isEmpty()) {
            log.warn("No metadata to update for approval event: {}", ragDocId);
            return true;
        }

        return ragIndexingService.updateDocumentMetadata(ragDocId, metadataUpdate);
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.error("Failed to parse payload: {}", payloadJson, e);
            return new HashMap<>();
        }
    }

    /**
     * Get consumer status.
     */
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", streamEnabled);
        status.put("running", isRunning.get());
        status.put("consumerId", consumerId);
        status.put("consumerGroup", RedisStreamConfig.CONSUMER_GROUP);
        status.put("streamKey", RedisStreamConfig.DELIVERABLE_STREAM_KEY);
        return status;
    }
}
