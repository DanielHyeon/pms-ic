package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.dto.ChatRequest;
import com.insuretech.pms.chat.dto.ChatResponse;
import com.insuretech.pms.chat.dto.ChatStreamRequest;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import com.insuretech.pms.chat.service.ReactiveChatService;
import com.insuretech.pms.chat.gateway.HealthChecker;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Tag(name = "Reactive Chat", description = "Reactive AI Chatbot API with SSE streaming")
@RestController
@RequestMapping("/api/v2/chat")
@RequiredArgsConstructor
@Slf4j
public class ReactiveChatController {

    private final ReactiveChatService reactiveChatService;
    private final HealthChecker healthChecker;

    /**
     * SSE Streaming chat endpoint using Standard SSE Contract
     * Events: meta, delta, done, error
     */
    @Operation(summary = "Stream chat message (Standard SSE)",
               description = "Send message and receive streaming response via SSE with standard event contract")
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamChat(
            @RequestBody ChatStreamRequest request,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "guest";
        log.info("Stream chat request: user={}, engine={}, sessionId={}",
                userId, request.getEngine(), request.getSessionId());

        return reactiveChatService.streamChatV2(request, userId);
    }

    /**
     * Legacy streaming endpoint (backwards compatible)
     */
    @Operation(summary = "Stream chat message (Legacy)",
               description = "Send message and receive streaming response - legacy format")
    @PostMapping(value = "/stream/legacy", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamChatLegacy(
            @RequestBody ChatRequest request,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "guest";

        // Convert to new format
        ChatStreamRequest streamRequest = ChatStreamRequest.builder()
                .sessionId(request.getSessionId())
                .message(request.getMessage())
                .projectId(request.getProjectId())
                .userRole(request.getUserRole())
                .userAccessLevel(request.getUserAccessLevel())
                .engine("auto")
                .build();

        return reactiveChatService.streamChatV2(streamRequest, userId);
    }

    @Operation(summary = "Send message (non-streaming)", description = "Send message and receive complete response")
    @PostMapping("/message")
    public Mono<ApiResponse<ChatResponse>> sendMessage(
            @RequestBody ChatRequest request,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "guest";

        return reactiveChatService.sendMessage(request, userId)
                .map(ApiResponse::success);
    }

    @Operation(summary = "Get chat history", description = "Retrieve conversation history for a session")
    @GetMapping("/history/{sessionId}")
    public Mono<ApiResponse<List<R2dbcChatMessage>>> getHistory(@PathVariable String sessionId) {
        return reactiveChatService.getHistory(sessionId)
                .collectList()
                .map(ApiResponse::success);
    }

    @Operation(summary = "Get user sessions", description = "Retrieve all chat sessions for current user")
    @GetMapping("/sessions")
    public Mono<ApiResponse<List<R2dbcChatSession>>> getUserSessions(Principal principal) {
        String userId = principal != null ? principal.getName() : "guest";
        return reactiveChatService.getUserSessions(userId)
                .collectList()
                .map(ApiResponse::success);
    }

    @Operation(summary = "Delete session", description = "Delete a chat session")
    @DeleteMapping("/session/{sessionId}")
    public Mono<ApiResponse<Void>> deleteSession(@PathVariable String sessionId) {
        return reactiveChatService.deleteSession(sessionId)
                .thenReturn(ApiResponse.success("Session deleted", null));
    }

    @Operation(summary = "Get engine health status", description = "Get health status of LLM engines")
    @GetMapping("/health/engines")
    public Mono<ApiResponse<Map<String, HealthChecker.HealthStatus>>> getEngineHealth() {
        return Mono.just(ApiResponse.success(healthChecker.getAllHealth()));
    }

    @Operation(summary = "Get detailed engine health", description = "Get detailed health info for a specific engine")
    @GetMapping("/health/engines/{engine}")
    public Mono<ApiResponse<Map<String, Object>>> getEngineHealthDetail(@PathVariable String engine) {
        return Mono.just(ApiResponse.success(healthChecker.getDetailedHealth(engine)));
    }

    @Operation(summary = "Health check with SSE", description = "SSE connection test endpoint")
    @GetMapping(value = "/health/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> healthStream() {
        return Flux.interval(Duration.ofSeconds(1))
                .take(5)
                .map(seq -> ServerSentEvent.<String>builder()
                        .id(String.valueOf(seq))
                        .event("ping")
                        .data("{\"count\":" + seq + "}")
                        .build());
    }
}
