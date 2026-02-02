package com.insuretech.pms.lineage.service;

import com.insuretech.pms.lineage.reactive.entity.R2dbcOutboxEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * Scheduler service that polls outbox events and sends them to Neo4j via LLM service.
 * Uses the Outbox Pattern for reliable event delivery.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveOutboxPoller {

    private final ReactiveLineageService lineageService;
    private final WebClient.Builder webClientBuilder;

    @Value("${llm.service.url:http://localhost:8000}")
    private String llmServiceUrl;

    @Value("${lineage.poller.batch-size:50}")
    private int batchSize;

    @Value("${lineage.poller.max-retries:3}")
    private int maxRetries;

    @Value("${lineage.poller.enabled:true}")
    private boolean pollerEnabled;

    /**
     * Poll pending events every 5 seconds and send to Neo4j
     */
    @Scheduled(fixedDelayString = "${lineage.poller.interval:5000}")
    public void pollPendingEvents() {
        if (!pollerEnabled) {
            return;
        }

        lineageService.getPendingEvents(batchSize)
                .flatMap(this::processEvent)
                .subscribe(
                        event -> log.debug("Processed event: {}", event.getId()),
                        error -> log.error("Error polling pending events", error),
                        () -> log.trace("Pending events poll cycle completed")
                );
    }

    /**
     * Retry failed events every 30 seconds
     */
    @Scheduled(fixedDelayString = "${lineage.poller.retry-interval:30000}")
    public void retryFailedEvents() {
        if (!pollerEnabled) {
            return;
        }

        lineageService.getFailedEventsForRetry(maxRetries, batchSize)
                .flatMap(this::processEvent)
                .subscribe(
                        event -> log.info("Retried event: {}", event.getId()),
                        error -> log.error("Error retrying failed events", error),
                        () -> log.trace("Failed events retry cycle completed")
                );
    }

    /**
     * Process a single outbox event by sending it to Neo4j via LLM service
     */
    private Mono<R2dbcOutboxEvent> processEvent(R2dbcOutboxEvent event) {
        return sendToNeo4j(event)
                .flatMap(success -> {
                    if (success) {
                        return lineageService.markPublished(event.getId())
                                .thenReturn(event);
                    } else {
                        return lineageService.markFailed(event.getId(), "Neo4j sync returned false")
                                .thenReturn(event);
                    }
                })
                .onErrorResume(error -> {
                    log.error("Failed to process event {}: {}", event.getId(), error.getMessage());
                    return lineageService.markFailed(event.getId(), error.getMessage())
                            .thenReturn(event);
                });
    }

    /**
     * Send event to Neo4j via LLM service
     */
    private Mono<Boolean> sendToNeo4j(R2dbcOutboxEvent event) {
        WebClient webClient = webClientBuilder.baseUrl(llmServiceUrl).build();

        Map<String, Object> requestBody = Map.of(
                "eventId", event.getId().toString(),
                "eventType", event.getEventType(),
                "aggregateType", event.getAggregateType(),
                "aggregateId", event.getAggregateId(),
                "projectId", event.getProjectId() != null ? event.getProjectId() : "",
                "payload", event.getPayload()
        );

        return webClient.post()
                .uri("/api/lineage/sync")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(10))
                .map(response -> {
                    Object success = response.get("success");
                    return success != null && Boolean.TRUE.equals(success);
                })
                .doOnSuccess(result -> log.debug("Neo4j sync result for {}: {}", event.getId(), result))
                .onErrorResume(error -> {
                    log.warn("Neo4j sync failed for {}: {}", event.getId(), error.getMessage());
                    return Mono.just(false);
                });
    }

    /**
     * Manual trigger to process all pending events (for admin use)
     */
    public Mono<Long> processAllPendingEvents() {
        return lineageService.getPendingEvents(1000)
                .flatMap(this::processEvent)
                .count()
                .doOnSuccess(count -> log.info("Manually processed {} pending events", count));
    }

    /**
     * Get poller status
     */
    public Map<String, Object> getPollerStatus() {
        return Map.of(
                "enabled", pollerEnabled,
                "batchSize", batchSize,
                "maxRetries", maxRetries,
                "llmServiceUrl", llmServiceUrl
        );
    }
}
