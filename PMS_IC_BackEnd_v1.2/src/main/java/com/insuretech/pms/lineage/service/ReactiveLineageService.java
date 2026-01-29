package com.insuretech.pms.lineage.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.lineage.dto.LineageEventDto;
import com.insuretech.pms.lineage.entity.LineageEventType;
import com.insuretech.pms.lineage.reactive.entity.R2dbcOutboxEvent;
import com.insuretech.pms.lineage.reactive.repository.ReactiveOutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveLineageService {

    private final ReactiveOutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    private final Map<String, Sinks.Many<LineageEventDto>> projectEventSinks = new ConcurrentHashMap<>();

    /**
     * Publish a lineage event to the outbox
     */
    public Mono<R2dbcOutboxEvent> publishEvent(String projectId, LineageEventType eventType,
                                                String aggregateType, String aggregateId,
                                                Map<String, Object> payload) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);

            R2dbcOutboxEvent event = R2dbcOutboxEvent.builder()
                    .id(UUID.randomUUID())
                    .eventType(eventType.name())
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .projectId(projectId)
                    .payload(payloadJson)
                    .status("PENDING")
                    .createdAt(LocalDateTime.now())
                    .idempotencyKey(generateIdempotencyKey(aggregateType, aggregateId, eventType))
                    .build();

            return outboxRepository.save(event)
                    .doOnSuccess(saved -> {
                        log.info("Published lineage event: type={}, aggregate={}:{}",
                                eventType, aggregateType, aggregateId);
                        emitToStream(projectId, toDto(saved));
                    });
        } catch (JsonProcessingException e) {
            return Mono.error(new RuntimeException("Failed to serialize payload", e));
        }
    }

    /**
     * Stream lineage events for a project (SSE)
     */
    public Flux<LineageEventDto> streamProjectEvents(String projectId) {
        Sinks.Many<LineageEventDto> sink = getOrCreateSink(projectId);
        return sink.asFlux()
                .doOnCancel(() -> log.debug("Client disconnected from lineage stream: {}", projectId));
    }

    /**
     * Get pending events for processing
     */
    public Flux<R2dbcOutboxEvent> getPendingEvents(int limit) {
        return outboxRepository.findPendingEvents(limit);
    }

    /**
     * Get failed events for retry
     */
    public Flux<R2dbcOutboxEvent> getFailedEventsForRetry(int maxRetries, int limit) {
        return outboxRepository.findFailedEventsForRetry(maxRetries, limit);
    }

    /**
     * Mark event as published
     */
    public Mono<Void> markPublished(UUID eventId) {
        return outboxRepository.markPublished(eventId)
                .doOnSuccess(v -> log.debug("Marked event published: {}", eventId));
    }

    /**
     * Mark event as failed
     */
    public Mono<Void> markFailed(UUID eventId, String error) {
        return outboxRepository.markFailed(eventId, error)
                .doOnSuccess(v -> log.warn("Marked event failed: {}, error: {}", eventId, error));
    }

    /**
     * Get events by aggregate
     */
    public Flux<LineageEventDto> getEventsByAggregate(String aggregateType, String aggregateId) {
        return outboxRepository.findByAggregateTypeAndAggregateId(aggregateType, aggregateId)
                .map(this::toDto);
    }

    /**
     * Get events by project
     */
    public Flux<LineageEventDto> getEventsByProject(String projectId) {
        return outboxRepository.findByProjectId(projectId)
                .map(this::toDto);
    }

    private Sinks.Many<LineageEventDto> getOrCreateSink(String projectId) {
        return projectEventSinks.computeIfAbsent(projectId,
                k -> Sinks.many().multicast().onBackpressureBuffer());
    }

    private void emitToStream(String projectId, LineageEventDto event) {
        Sinks.Many<LineageEventDto> sink = projectEventSinks.get(projectId);
        if (sink != null) {
            sink.tryEmitNext(event);
        }
    }

    private String generateIdempotencyKey(String aggregateType, String aggregateId, LineageEventType eventType) {
        return String.format("%s:%s:%s:%d", aggregateType, aggregateId, eventType, System.currentTimeMillis());
    }

    @SuppressWarnings("unchecked")
    private LineageEventDto toDto(R2dbcOutboxEvent entity) {
        Map<String, Object> payload = null;
        try {
            if (entity.getPayload() != null) {
                payload = objectMapper.readValue(entity.getPayload(), Map.class);
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse payload for event: {}", entity.getId());
        }

        return LineageEventDto.builder()
                .id(entity.getId() != null ? entity.getId().toString() : null)
                .eventType(parseEventType(entity.getEventType()))
                .aggregateType(entity.getAggregateType())
                .aggregateId(entity.getAggregateId())
                .timestamp(entity.getCreatedAt())
                .changes(payload)
                .build();
    }

    private LineageEventType parseEventType(String type) {
        try {
            return type != null ? LineageEventType.valueOf(type) : LineageEventType.REQUIREMENT_CREATED;
        } catch (IllegalArgumentException e) {
            return LineageEventType.REQUIREMENT_CREATED;
        }
    }
}
