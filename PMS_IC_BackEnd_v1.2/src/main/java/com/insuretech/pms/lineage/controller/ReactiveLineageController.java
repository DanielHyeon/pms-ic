package com.insuretech.pms.lineage.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.dto.sse.*;
import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.lineage.dto.LineageEventDto;
import com.insuretech.pms.lineage.dto.LineageGraphDto;
import com.insuretech.pms.lineage.service.ReactiveLineageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v2/projects/{projectId}/lineage")
@RequiredArgsConstructor
public class ReactiveLineageController {

    private final ReactiveLineageService lineageService;
    private final SseEventBuilder sseBuilder;
    private final ObjectMapper objectMapper;

    @GetMapping("/graph")
    public Mono<ResponseEntity<ApiResponse<LineageGraphDto>>> getLineageGraph(
            @PathVariable String projectId) {
        return lineageService.buildLineageGraph(projectId)
                .map(graph -> ResponseEntity.ok(ApiResponse.success(graph)));
    }

    @GetMapping("/events")
    public Mono<ResponseEntity<ApiResponse<List<LineageEventDto>>>> getEventsByProject(
            @PathVariable String projectId) {
        return lineageService.getEventsByProject(projectId)
                .collectList()
                .map(events -> ResponseEntity.ok(ApiResponse.success(events)));
    }

    @GetMapping("/events/by-aggregate")
    public Mono<ResponseEntity<ApiResponse<List<LineageEventDto>>>> getEventsByAggregate(
            @PathVariable String projectId,
            @RequestParam String aggregateType,
            @RequestParam String aggregateId) {
        return lineageService.getEventsByAggregate(aggregateType, aggregateId)
                .collectList()
                .map(events -> ResponseEntity.ok(ApiResponse.success(events)));
    }

    /**
     * SSE streaming endpoint for real-time lineage events.
     * Uses Standard SSE Event Contract: meta, delta, done, error
     */
    @GetMapping(value = "/events/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamLineageEvents(@PathVariable String projectId) {
        String traceId = UUID.randomUUID().toString();

        log.info("Client connected to lineage stream: projectId={}, traceId={}", projectId, traceId);

        return Flux.concat(
                // Meta event (stream start)
                Flux.just(sseBuilder.meta(MetaEvent.builder()
                        .traceId(traceId)
                        .mode("lineage_stream")
                        .timestamp(Instant.now())
                        .build())),

                // Delta events for each lineage event
                lineageService.streamProjectEvents(projectId)
                        .map(event -> {
                            try {
                                String jsonPayload = objectMapper.writeValueAsString(event);
                                return sseBuilder.delta(DeltaEvent.builder()
                                        .kind(DeltaKind.JSON)
                                        .json(jsonPayload)
                                        .build());
                            } catch (Exception e) {
                                log.error("Error serializing lineage event", e);
                                return sseBuilder.error("SERIALIZATION_ERROR", e.getMessage(), traceId);
                            }
                        })
        ).doOnCancel(() -> log.info("Client disconnected from lineage stream: {}", traceId))
         .doOnError(e -> log.error("Error in lineage stream: {}", e.getMessage()));
    }
}
