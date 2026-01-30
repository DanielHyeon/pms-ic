package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.dto.ChatRequest;
import com.insuretech.pms.chat.dto.ChatResponse;
import com.insuretech.pms.chat.dto.ChatStreamRequest;
import com.insuretech.pms.chat.exception.ChatException;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import com.insuretech.pms.chat.service.ReactiveChatService;
import com.insuretech.pms.chat.gateway.HealthChecker;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Reactive Chat Controller providing AI chatbot functionality with SSE streaming.
 * Supports both streaming and non-streaming chat modes with tool calling capabilities.
 */
@Tag(name = "Reactive Chat", description = "Reactive AI Chatbot API with SSE streaming")
@RestController
@RequestMapping("/api/v2/chat")
@RequiredArgsConstructor
@Validated
@Slf4j
public class ReactiveChatController {

    private static final String UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

    private final ReactiveChatService reactiveChatService;
    private final HealthChecker healthChecker;

    /**
     * SSE Streaming chat endpoint using Standard SSE Contract.
     * Events: meta, delta, done, error
     */
    @Operation(
            summary = "Stream chat message (Standard SSE)",
            description = "Send message and receive streaming response via SSE with standard event contract. " +
                    "Supports tool calling when enableTools is set to true."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "SSE stream established successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid request parameters",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Authentication required"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "503",
                    description = "LLM engine unavailable"
            )
    })
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamChat(
            @Valid @RequestBody ChatStreamRequest request,
            Principal principal) {

        String userId = extractUserId(principal);
        log.info("Stream chat request: user={}, engine={}, sessionId={}, tools={}",
                userId, request.getEngine(), request.getSessionId(), request.isEnableTools());

        return reactiveChatService.streamChatV2(request, userId)
                .doOnError(e -> log.error("Stream error for user={}: {}", userId, e.getMessage()))
                .onErrorResume(this::handleStreamError);
    }

    /**
     * Legacy streaming endpoint for backwards compatibility.
     */
    @Operation(
            summary = "Stream chat message (Legacy)",
            description = "Send message and receive streaming response - legacy format. " +
                    "Converts to new format internally."
    )
    @PostMapping(value = "/stream/legacy", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamChatLegacy(
            @Valid @RequestBody ChatRequest request,
            Principal principal) {

        String userId = extractUserId(principal);
        log.debug("Legacy stream request from user={}", userId);

        // Convert to new format
        ChatStreamRequest streamRequest = ChatStreamRequest.builder()
                .sessionId(request.getSessionId())
                .message(request.getMessage())
                .projectId(request.getProjectId())
                .userRole(request.getUserRole())
                .userAccessLevel(request.getUserAccessLevel())
                .engine("auto")
                .build();

        return reactiveChatService.streamChatV2(streamRequest, userId)
                .doOnError(e -> log.error("Legacy stream error for user={}: {}", userId, e.getMessage()))
                .onErrorResume(this::handleStreamError);
    }

    /**
     * Non-streaming chat endpoint for synchronous requests.
     */
    @Operation(
            summary = "Send message (non-streaming)",
            description = "Send message and receive complete response synchronously"
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Message processed successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid request parameters"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Session not found"
            )
    })
    @PostMapping("/message")
    public Mono<ApiResponse<ChatResponse>> sendMessage(
            @Valid @RequestBody ChatRequest request,
            Principal principal) {

        String userId = extractUserId(principal);
        log.info("Send message request: user={}, sessionId={}", userId, request.getSessionId());

        return reactiveChatService.sendMessage(request, userId)
                .map(ApiResponse::success)
                .doOnError(e -> log.error("Send message error for user={}: {}", userId, e.getMessage()));
    }

    /**
     * Retrieves conversation history for a session.
     */
    @Operation(
            summary = "Get chat history",
            description = "Retrieve conversation history for a specific session"
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "History retrieved successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid session ID format"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Session not found"
            )
    })
    @GetMapping("/history/{sessionId}")
    public Mono<ApiResponse<List<R2dbcChatMessage>>> getHistory(
            @Parameter(description = "Session ID (UUID format)", required = true)
            @PathVariable
            @NotBlank(message = "Session ID is required")
            @Pattern(regexp = UUID_PATTERN, message = "Session ID must be a valid UUID")
            String sessionId) {

        log.debug("Get history request: sessionId={}", sessionId);

        return reactiveChatService.getHistory(sessionId)
                .collectList()
                .map(ApiResponse::success)
                .switchIfEmpty(Mono.just(ApiResponse.success(List.of())));
    }

    /**
     * Retrieves all chat sessions for the current user.
     */
    @Operation(
            summary = "Get user sessions",
            description = "Retrieve all active chat sessions for the authenticated user"
    )
    @GetMapping("/sessions")
    public Mono<ApiResponse<List<R2dbcChatSession>>> getUserSessions(Principal principal) {
        String userId = extractUserId(principal);
        log.debug("Get sessions request: user={}", userId);

        return reactiveChatService.getUserSessions(userId)
                .collectList()
                .map(ApiResponse::success);
    }

    /**
     * Deletes a chat session.
     */
    @Operation(
            summary = "Delete session",
            description = "Delete a chat session and its associated messages"
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Session deleted successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid session ID format"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Session not found"
            )
    })
    @DeleteMapping("/session/{sessionId}")
    @ResponseStatus(HttpStatus.OK)
    public Mono<ApiResponse<Void>> deleteSession(
            @Parameter(description = "Session ID (UUID format)", required = true)
            @PathVariable
            @NotBlank(message = "Session ID is required")
            @Pattern(regexp = UUID_PATTERN, message = "Session ID must be a valid UUID")
            String sessionId,
            Principal principal) {

        String userId = extractUserId(principal);
        log.info("Delete session request: user={}, sessionId={}", userId, sessionId);

        return reactiveChatService.deleteSession(sessionId, userId)
                .thenReturn(ApiResponse.success("Session deleted", null));
    }

    /**
     * Gets health status of all LLM engines.
     */
    @Operation(
            summary = "Get engine health status",
            description = "Get health status of all available LLM engines"
    )
    @GetMapping("/health/engines")
    public Mono<ApiResponse<Map<String, HealthChecker.HealthStatus>>> getEngineHealth() {
        return Mono.just(ApiResponse.success(healthChecker.getAllHealth()));
    }

    /**
     * Gets detailed health information for a specific engine.
     */
    @Operation(
            summary = "Get detailed engine health",
            description = "Get detailed health information for a specific LLM engine"
    )
    @GetMapping("/health/engines/{engine}")
    public Mono<ApiResponse<Map<String, Object>>> getEngineHealthDetail(
            @Parameter(description = "Engine name (gguf, vllm)", required = true)
            @PathVariable
            @Pattern(regexp = "^(gguf|vllm)$", message = "Engine must be 'gguf' or 'vllm'")
            String engine) {

        return Mono.just(ApiResponse.success(healthChecker.getDetailedHealth(engine)));
    }

    /**
     * SSE connection test endpoint.
     */
    @Operation(
            summary = "Health check with SSE",
            description = "SSE connection test endpoint - sends 5 ping events"
    )
    @GetMapping(value = "/health/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> healthStream() {
        return Flux.interval(Duration.ofSeconds(1))
                .take(5)
                .map(seq -> ServerSentEvent.<String>builder()
                        .id(String.valueOf(seq))
                        .event("ping")
                        .data("{\"count\":" + seq + ",\"status\":\"healthy\"}")
                        .build());
    }

    /**
     * Extracts user ID from Principal, defaulting to "guest" for unauthenticated requests.
     */
    private String extractUserId(Principal principal) {
        if (principal == null) {
            log.warn("Unauthenticated request - using guest user");
            return "guest";
        }
        return principal.getName();
    }

    /**
     * Handles stream errors by converting them to SSE error events.
     */
    private Flux<ServerSentEvent<String>> handleStreamError(Throwable e) {
        String errorCode;
        String message;

        if (e instanceof ChatException chatEx) {
            errorCode = chatEx.getErrorCode();
            message = chatEx.getMessage();
        } else if (e instanceof IllegalArgumentException) {
            errorCode = "CHAT_INVALID_REQUEST";
            message = e.getMessage();
        } else {
            errorCode = "CHAT_INTERNAL_ERROR";
            message = "An unexpected error occurred";
            log.error("Unexpected stream error", e);
        }

        String errorJson = String.format(
                "{\"error\":{\"code\":\"%s\",\"message\":\"%s\"}}",
                errorCode,
                escapeJson(message)
        );

        return Flux.just(ServerSentEvent.<String>builder()
                .event("error")
                .data(errorJson)
                .build());
    }

    /**
     * Escapes special characters for JSON string values.
     */
    private String escapeJson(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
