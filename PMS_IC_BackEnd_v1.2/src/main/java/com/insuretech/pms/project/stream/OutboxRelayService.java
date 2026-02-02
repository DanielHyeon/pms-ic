package com.insuretech.pms.project.stream;

import com.insuretech.pms.project.reactive.entity.R2dbcDeliverableOutbox;
import com.insuretech.pms.project.reactive.repository.ReactiveDeliverableOutboxRepository;
import com.insuretech.pms.project.service.DeliverableOutboxService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Service that relays outbox events to Redis Streams.
 *
 * This implements the "relay" part of the Transactional Outbox Pattern:
 * 1. Polls the outbox table for pending events
 * 2. Publishes them to Redis Streams
 * 3. Marks them as relayed in the outbox table
 *
 * The actual processing is done by DeliverableStreamConsumer.
 */
@Slf4j
@Service
public class OutboxRelayService {

    private final DeliverableOutboxService outboxService;
    private final ReactiveDeliverableOutboxRepository outboxRepository;
    private final DeliverableStreamPublisher streamPublisher;

    @Value("${lineage.redis.stream.enabled:true}")
    private boolean streamEnabled;

    @Value("${lineage.redis.stream.relay-batch-size:50}")
    private int relayBatchSize;

    private final AtomicBoolean isRelaying = new AtomicBoolean(false);
    private final AtomicLong totalRelayed = new AtomicLong(0);

    public OutboxRelayService(
            DeliverableOutboxService outboxService,
            ReactiveDeliverableOutboxRepository outboxRepository,
            DeliverableStreamPublisher streamPublisher
    ) {
        this.outboxService = outboxService;
        this.outboxRepository = outboxRepository;
        this.streamPublisher = streamPublisher;
    }

    /**
     * Scheduled job to relay pending events to Redis Streams.
     * Runs every 3 seconds by default (faster than the direct poller).
     */
    @Scheduled(fixedDelayString = "${lineage.redis.stream.relay-interval:3000}")
    public void relayPendingEvents() {
        if (!streamEnabled) {
            return;
        }

        if (!isRelaying.compareAndSet(false, true)) {
            log.debug("Relay is already in progress, skipping this cycle");
            return;
        }

        try {
            log.debug("Starting outbox relay cycle");

            outboxService.getPendingEvents(relayBatchSize)
                    .flatMap(this::relayEvent)
                    .count()
                    .doOnSuccess(count -> {
                        if (count > 0) {
                            totalRelayed.addAndGet(count);
                            log.info("Relayed {} events to Redis Streams (total: {})", count, totalRelayed.get());
                        }
                    })
                    .doOnError(e -> log.error("Error in relay cycle", e))
                    .doFinally(signal -> {
                        isRelaying.set(false);
                        log.debug("Completed outbox relay cycle");
                    })
                    .subscribeOn(Schedulers.boundedElastic())
                    .subscribe();

        } catch (Exception e) {
            log.error("Fatal error in relay cycle", e);
            isRelaying.set(false);
        }
    }

    /**
     * Relay a single event to Redis Streams.
     */
    private Mono<R2dbcDeliverableOutbox> relayEvent(R2dbcDeliverableOutbox event) {
        // Skip if already relayed
        if (R2dbcDeliverableOutbox.STATUS_RELAYED.equals(event.getStatus())) {
            return Mono.empty();
        }

        return streamPublisher.publishEvent(event)
                .<R2dbcDeliverableOutbox>flatMap(recordId ->
                    outboxRepository.markAsRelayed(
                            event.getId(),
                            recordId.getValue(),
                            LocalDateTime.now()
                    ).thenReturn(event)
                )
                .doOnSuccess(e -> log.debug("Relayed event: {} to stream", event.getId()))
                .onErrorResume(e -> {
                    log.error("Failed to relay event: {}", event.getId(), e);
                    return Mono.empty();
                });
    }

    /**
     * Manual trigger for relaying (useful for testing).
     */
    public Mono<Long> triggerRelay() {
        if (!streamEnabled) {
            return Mono.just(0L);
        }

        return outboxService.getPendingEvents(relayBatchSize)
                .flatMap(this::relayEvent)
                .count()
                .doOnSuccess(count -> log.info("Manually relayed {} events", count));
    }

    /**
     * Get relay service status.
     */
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", streamEnabled);
        status.put("relaying", isRelaying.get());
        status.put("batchSize", relayBatchSize);
        status.put("totalRelayed", totalRelayed.get());

        // Get stream length
        if (streamEnabled) {
            streamPublisher.getStreamLength()
                    .doOnSuccess(length -> status.put("streamLength", length))
                    .subscribe();
        }

        return status;
    }
}
