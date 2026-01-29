package com.insuretech.pms.task.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.dto.sse.*;
import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.task.dto.KanbanBoardDto;
import com.insuretech.pms.task.dto.TaskDto;
import com.insuretech.pms.task.dto.TaskMoveRequest;
import com.insuretech.pms.task.service.ReactiveKanbanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v2/projects/{projectId}/kanban")
@RequiredArgsConstructor
public class ReactiveKanbanController {

    private final ReactiveKanbanService kanbanService;
    private final SseEventBuilder sseBuilder;
    private final ObjectMapper objectMapper;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<KanbanBoardDto>>> getKanbanBoard(
            @PathVariable String projectId) {
        return kanbanService.getKanbanBoard(projectId)
                .map(board -> ResponseEntity.ok(ApiResponse.success(board)));
    }

    /**
     * SSE streaming endpoint for real-time Kanban updates.
     * Uses Standard SSE Event Contract: meta, delta, done, error
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamKanbanUpdates(@PathVariable String projectId) {
        String traceId = UUID.randomUUID().toString();

        log.info("Client connected to kanban stream: projectId={}, traceId={}", projectId, traceId);

        // Send meta event first, then stream task events
        return Flux.concat(
                // Meta event (stream start)
                Flux.just(sseBuilder.meta(MetaEvent.builder()
                        .traceId(traceId)
                        .mode("kanban_stream")
                        .timestamp(java.time.Instant.now())
                        .build())),

                // Delta events for each task update
                kanbanService.streamTaskEvents(projectId)
                        .map(event -> {
                            try {
                                String jsonPayload = objectMapper.writeValueAsString(event);
                                return sseBuilder.delta(DeltaEvent.builder()
                                        .kind(DeltaKind.JSON)
                                        .json(jsonPayload)
                                        .build());
                            } catch (Exception e) {
                                log.error("Error serializing task event", e);
                                return sseBuilder.error("SERIALIZATION_ERROR", e.getMessage(), traceId);
                            }
                        })
        ).doOnCancel(() -> log.info("Client disconnected from kanban stream: {}", traceId))
         .doOnError(e -> log.error("Error in kanban stream: {}", e.getMessage()));
    }

    @PostMapping("/tasks")
    public Mono<ResponseEntity<ApiResponse<TaskDto>>> createTask(
            @PathVariable String projectId,
            @Valid @RequestBody TaskDto dto) {
        return kanbanService.createTask(projectId, dto)
                .map(task -> ResponseEntity.ok(ApiResponse.success("Task created", task)));
    }

    @PatchMapping("/tasks/{taskId}/move")
    public Mono<ResponseEntity<ApiResponse<TaskDto>>> moveTask(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @Valid @RequestBody TaskMoveRequest request) {
        return kanbanService.moveTask(taskId, request)
                .map(task -> ResponseEntity.ok(ApiResponse.success("Task moved", task)));
    }

    @PutMapping("/tasks/{taskId}")
    public Mono<ResponseEntity<ApiResponse<TaskDto>>> updateTask(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @Valid @RequestBody TaskDto dto) {
        return kanbanService.updateTask(taskId, dto)
                .map(task -> ResponseEntity.ok(ApiResponse.success("Task updated", task)));
    }

    @DeleteMapping("/tasks/{taskId}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteTask(
            @PathVariable String projectId,
            @PathVariable String taskId) {
        return kanbanService.deleteTask(taskId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Task deleted", null))));
    }
}
