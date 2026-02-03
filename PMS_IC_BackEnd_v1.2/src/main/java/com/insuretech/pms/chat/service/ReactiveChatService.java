package com.insuretech.pms.chat.service;

import com.insuretech.pms.chat.dto.AIChatContext;
import com.insuretech.pms.chat.dto.ChatChunk;
import com.insuretech.pms.chat.dto.ChatMessageDto;
import com.insuretech.pms.chat.dto.ChatRequest;
import com.insuretech.pms.chat.dto.ChatResponse;
import com.insuretech.pms.chat.dto.ChatStreamRequest;
import com.insuretech.pms.chat.dto.sse.SseEventBuilder;
import com.insuretech.pms.chat.exception.ChatException;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.gateway.LlmGatewayService;
import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import com.insuretech.pms.chat.tool.StreamingToolOrchestrator;
import com.insuretech.pms.chat.tool.ToolContext;
import com.insuretech.pms.chat.tool.ToolRegistry;
import com.insuretech.pms.chat.gateway.dto.ToolDefinition;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatMessageRepository;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Reactive Chat Service providing AI chatbot functionality.
 * Handles session management, message persistence, and LLM interactions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveChatService {

    private static final int MAX_CONTEXT_MESSAGES = 10;
    private static final int MAX_MESSAGE_LENGTH = 10000;
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final ReactiveChatSessionRepository sessionRepository;
    private final ReactiveChatMessageRepository messageRepository;
    private final ReactiveAIChatClient reactiveAIChatClient;
    private final ReactiveRedisTemplate<String, Object> reactiveRedisTemplate;
    private final TransactionalOperator transactionalOperator;
    private final LlmGatewayService llmGatewayService;
    private final SseEventBuilder sseBuilder;
    private final StreamingToolOrchestrator streamingToolOrchestrator;
    private final ToolRegistry toolRegistry;
    private final ChatContextEnrichmentService contextEnrichmentService;

    /**
     * Legacy streaming chat method.
     * @deprecated Use {@link #streamChatV2(ChatStreamRequest, String)} instead.
     */
    @Deprecated
    public Flux<ChatChunk> streamChat(ChatRequest request, String userId) {
        validateMessage(request.getMessage());

        AtomicReference<StringBuilder> contentAccumulator = new AtomicReference<>(new StringBuilder());

        return getOrCreateSession(request.getSessionId(), userId)
                .flatMapMany(session -> {
                    return saveUserMessage(session.getId(), request.getMessage())
                            .flatMapMany(userMessage -> {
                                return getRecentMessages(session.getId(), MAX_CONTEXT_MESSAGES)
                                        .collectList()
                                        .flatMapMany(recentMessages -> {
                                            AIChatContext context = buildContext(
                                                    userId, request, toJpaMessages(recentMessages));

                                            return reactiveAIChatClient.streamChat(context)
                                                    .doOnNext(chunk -> {
                                                        if (!chunk.isDone()) {
                                                            contentAccumulator.get().append(chunk.getContent());
                                                        }
                                                    })
                                                    .doOnComplete(() -> {
                                                        String fullContent = contentAccumulator.get().toString();
                                                        if (!fullContent.isEmpty()) {
                                                            saveAssistantMessage(session.getId(), fullContent)
                                                                    .subscribe(
                                                                            saved -> log.debug("Saved assistant message: {}", saved.getId()),
                                                                            error -> log.error("Failed to save assistant message: {}", error.getMessage())
                                                                    );
                                                        }
                                                    });
                                        });
                            });
                })
                .onErrorResume(e -> {
                    log.error("Stream chat error: {}", e.getMessage(), e);
                    return Flux.just(ChatChunk.error(
                            request.getSessionId(), "error", sanitizeErrorMessage(e)));
                });
    }

    /**
     * Stream chat using Standard SSE Contract (v2).
     * Events: meta, delta, done, error
     * Supports tool calling when enabled.
     *
     * @param request The chat stream request
     * @param userId The authenticated user ID
     * @return Flux of SSE events
     */
    public Flux<ServerSentEvent<String>> streamChatV2(ChatStreamRequest request, String userId) {
        // Validate input
        validateMessage(request.getMessage());

        String traceId = UUID.randomUUID().toString();
        AtomicReference<StringBuilder> contentAccumulator = new AtomicReference<>(new StringBuilder());
        AtomicReference<String> sessionIdRef = new AtomicReference<>();

        return getOrCreateSession(request.getSessionId(), userId)
                .flatMapMany(session -> {
                    sessionIdRef.set(session.getId());
                    log.info("StreamV2: traceId={}, session={}, user={}, engine={}, tools={}",
                            traceId, session.getId(), userId, request.getEngine(), request.isEnableTools());

                    return saveUserMessage(session.getId(), request.getMessage())
                            .flatMapMany(userMessage -> {
                                return getRecentMessages(session.getId(), MAX_CONTEXT_MESSAGES)
                                        .collectList()
                                        .flatMapMany(recentMessages -> {
                                            // Get task context for RAG enrichment
                                            return contextEnrichmentService.getTaskDocsForContext(
                                                            request.getMessage(),
                                                            request.getProjectId())
                                                    .flatMapMany(taskDocs -> {
                                                        // Merge task docs with any existing retrieved docs
                                                        ChatStreamRequest enrichedRequest = request;
                                                        if (!taskDocs.isEmpty()) {
                                                            log.info("StreamV2: Retrieved {} task documents for RAG context, traceId={}",
                                                                    taskDocs.size(), traceId);
                                                            List<String> allDocs = new ArrayList<>();
                                                            if (request.getRetrievedDocs() != null) {
                                                                allDocs.addAll(request.getRetrievedDocs());
                                                            }
                                                            allDocs.addAll(taskDocs);
                                                            enrichedRequest = ChatStreamRequest.builder()
                                                                    .sessionId(request.getSessionId())
                                                                    .message(request.getMessage())
                                                                    .engine(request.getEngine())
                                                                    .context(request.getContext())
                                                                    .retrievedDocs(allDocs)
                                                                    .projectId(request.getProjectId())
                                                                    .userRole(request.getUserRole())
                                                                    .userAccessLevel(request.getUserAccessLevel())
                                                                    .generation(request.getGeneration())
                                                                    .enableTools(request.isEnableTools())
                                                                    .tools(request.getTools())
                                                                    .build();
                                                        }

                                                        // Build gateway request with enriched context
                                                        GatewayRequest gatewayRequest = buildGatewayRequest(
                                                                traceId, enrichedRequest, recentMessages);

                                                        // Choose stream strategy based on tool support
                                                        Flux<ServerSentEvent<String>> stream;
                                                        if (enrichedRequest.isEnableTools() && toolRegistry.hasTools()) {
                                                            // Use tool orchestrator for tool-enabled requests
                                                            ToolContext toolContext = buildToolContext(
                                                                    userId, session.getId(), enrichedRequest, traceId);
                                                            stream = streamingToolOrchestrator.streamWithTools(
                                                                    llmGatewayService, gatewayRequest, toolContext);
                                                        } else {
                                                            // Standard streaming without tools
                                                            stream = llmGatewayService.streamChat(gatewayRequest);
                                                        }

                                                        return stream
                                                                .doOnNext(event -> {
                                                                    // Accumulate content from delta events
                                                                    if ("delta".equals(event.event())) {
                                                                        String data = event.data();
                                                                        if (data != null) {
                                                                            extractDeltaText(data).ifPresent(
                                                                                    text -> contentAccumulator.get().append(text)
                                                                            );
                                                                        }
                                                                    }
                                                                })
                                                                .doOnComplete(() -> {
                                                                    String fullContent = contentAccumulator.get().toString();
                                                                    if (!fullContent.isEmpty()) {
                                                                        saveAssistantMessageWithTrace(
                                                                                session.getId(),
                                                                                fullContent,
                                                                                traceId,
                                                                                request.getEngine()
                                                                        ).subscribe(
                                                                                saved -> log.debug("Saved assistant message: id={}, traceId={}",
                                                                                        saved.getId(), traceId),
                                                                                error -> log.error("Failed to save assistant message: traceId={}, error={}",
                                                                                        traceId, error.getMessage())
                                                                        );
                                                                    }
                                                                })
                                                                .doOnError(error -> log.error("Stream error: traceId={}, error={}",
                                                                        traceId, error.getMessage()));
                                                    });
                                        });
                            });
                })
                .onErrorResume(e -> {
                    log.error("StreamV2 error: traceId={}, error={}", traceId, e.getMessage(), e);
                    return Flux.just(sseBuilder.error(
                            mapErrorCode(e),
                            sanitizeErrorMessage(e),
                            traceId
                    ));
                });
    }

    /**
     * Sends a non-streaming chat message and receives a complete response.
     *
     * @param request The chat request
     * @param userId The authenticated user ID
     * @return Mono containing the chat response
     */
    public Mono<ChatResponse> sendMessage(ChatRequest request, String userId) {
        // Validate input
        validateMessage(request.getMessage());

        return getOrCreateSession(request.getSessionId(), userId)
                .flatMap(session ->
                        saveUserMessage(session.getId(), request.getMessage())
                                .flatMap(userMessage ->
                                        getRecentMessages(session.getId(), MAX_CONTEXT_MESSAGES)
                                                .collectList()
                                                .flatMap(recentMessages -> {
                                                    // Get task docs for RAG context (passed as retrieved_docs)
                                                    return contextEnrichmentService.getTaskDocsForContext(
                                                                    request.getMessage(),
                                                                    request.getProjectId())
                                                            .flatMap(taskDocs -> {
                                                                if (!taskDocs.isEmpty()) {
                                                                    log.info("Retrieved {} task documents for RAG context, user: {}",
                                                                            taskDocs.size(), userId);
                                                                }

                                                                // Build context with retrieved docs (original message unchanged)
                                                                AIChatContext context = AIChatContext.builder()
                                                                        .userId(userId)
                                                                        .message(request.getMessage())
                                                                        .recentMessages(toJpaMessages(recentMessages))
                                                                        .projectId(request.getProjectId())
                                                                        .userRole(request.getUserRole())
                                                                        .userAccessLevel(request.getUserAccessLevel())
                                                                        .retrievedDocs(taskDocs)
                                                                        .build();

                                                                return reactiveAIChatClient.chat(context)
                                                                        .flatMap(response -> saveAssistantMessage(session.getId(), response.getReply())
                                                                                .then(cacheMessages(session.getId(), userMessage))
                                                                                .thenReturn(response))
                                                                        .map(response -> {
                                                                            response.setSessionId(session.getId());
                                                                            return response;
                                                                        });
                                                            });
                                                })
                                )
                )
                .as(transactionalOperator::transactional)
                .onErrorMap(e -> {
                    if (e instanceof ChatException) {
                        return e;
                    }
                    log.error("Send message error: {}", e.getMessage(), e);
                    return ChatException.internalError("Failed to process message", null, e);
                });
    }

    /**
     * Retrieves chat history for a session.
     *
     * @param sessionId The session ID
     * @return Flux of chat messages
     */
    public Flux<R2dbcChatMessage> getHistory(String sessionId) {
        if (!StringUtils.hasText(sessionId)) {
            return Flux.error(ChatException.sessionNotFound("null"));
        }
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    /**
     * Deletes a chat session and validates ownership.
     *
     * @param sessionId The session ID to delete
     * @param userId The user ID requesting deletion
     * @return Mono completing when deletion is done
     */
    public Mono<Void> deleteSession(String sessionId, String userId) {
        if (!StringUtils.hasText(sessionId)) {
            return Mono.error(ChatException.sessionNotFound("null"));
        }

        return sessionRepository.findByIdAndActiveTrue(sessionId)
                .switchIfEmpty(Mono.error(ChatException.sessionNotFound(sessionId)))
                .flatMap(session -> {
                    // Validate ownership (unless guest or admin)
                    if (!"guest".equals(userId) && !session.getUserId().equals(userId)) {
                        log.warn("User {} attempted to delete session {} owned by {}",
                                userId, sessionId, session.getUserId());
                        return Mono.error(ChatException.forbidden("Cannot delete another user's session"));
                    }

                    return sessionRepository.deactivateSession(sessionId)
                            .then(reactiveRedisTemplate.delete("chat:session:" + sessionId))
                            .doOnSuccess(v -> log.info("Session deleted: sessionId={}, userId={}", sessionId, userId))
                            .then();
                });
    }

    /**
     * Retrieves all active sessions for a user.
     *
     * @param userId The user ID
     * @return Flux of chat sessions
     */
    public Flux<R2dbcChatSession> getUserSessions(String userId) {
        if (!StringUtils.hasText(userId)) {
            return Flux.empty();
        }
        return sessionRepository.findByUserIdAndActiveTrue(userId);
    }

    // ==================== Private Helper Methods ====================

    private void validateMessage(String message) {
        if (!StringUtils.hasText(message)) {
            throw ChatException.messageEmpty();
        }
        if (message.length() > MAX_MESSAGE_LENGTH) {
            throw ChatException.messageTooLong(MAX_MESSAGE_LENGTH);
        }
    }

    private String sanitizeErrorMessage(Throwable e) {
        // Don't expose internal error details to clients
        if (e instanceof ChatException) {
            return e.getMessage();
        }
        return "An error occurred while processing your request";
    }

    private String mapErrorCode(Throwable e) {
        if (e instanceof ChatException chatEx) {
            return chatEx.getErrorCode();
        }
        if (e instanceof IllegalArgumentException) {
            return "CHAT_INVALID_REQUEST";
        }
        return "CHAT_INTERNAL_ERROR";
    }

    private ToolContext buildToolContext(String userId, String sessionId,
                                         ChatStreamRequest request, String traceId) {
        return ToolContext.builder()
                .userId(userId)
                .sessionId(sessionId)
                .projectId(request.getProjectId())
                .userRole(request.getUserRole())
                .accessLevel(request.getUserAccessLevel())
                .traceId(traceId)
                .build();
    }

    private ToolDefinition convertToGatewayToolDefinition(
            com.insuretech.pms.chat.tool.ToolDefinition toolDef) {
        return ToolDefinition.function(
                toolDef.getName(),
                toolDef.getDescription(),
                toolDef.getParameters()
        );
    }

    private GatewayRequest buildGatewayRequest(String traceId, ChatStreamRequest request,
                                               List<R2dbcChatMessage> recentMessages) {
        List<ChatMessageDto> messages = new ArrayList<>();

        // Add system prompt
        String systemPrompt = buildSystemPrompt(request);
        messages.add(ChatMessageDto.builder()
                .role("system")
                .content(systemPrompt)
                .build());

        // Add RAG context if available (before conversation history)
        if (request.getRetrievedDocs() != null && !request.getRetrievedDocs().isEmpty()) {
            String ragContext = String.join("\n\n", request.getRetrievedDocs());
            messages.add(ChatMessageDto.builder()
                    .role("system")
                    .content("Context from retrieved documents:\n" + ragContext)
                    .build());
        }

        // Add conversation history
        for (R2dbcChatMessage msg : recentMessages) {
            String role = msg.getRole() != null ? msg.getRole().toLowerCase() : "user";
            // Validate role
            if (!"user".equals(role) && !"assistant".equals(role) && !"system".equals(role)) {
                role = "user";
            }
            messages.add(ChatMessageDto.builder()
                    .role(role)
                    .content(msg.getContent())
                    .build());
        }

        // Add current user message
        messages.add(ChatMessageDto.builder()
                .role("user")
                .content(request.getMessage())
                .build());

        // Build tool definitions if enabled
        List<ToolDefinition> tools = null;
        if (request.isEnableTools() && toolRegistry.hasTools()) {
            List<com.insuretech.pms.chat.tool.ToolDefinition> toolDefs;
            if (request.getTools() != null && !request.getTools().isEmpty()) {
                // Filter to specific tools if provided
                toolDefs = toolRegistry.getAllDefinitions().stream()
                        .filter(t -> request.getTools().contains(t.getName()))
                        .toList();
            } else {
                // Use all registered tools
                toolDefs = toolRegistry.getAllDefinitions();
            }
            // Convert to gateway ToolDefinition format
            tools = toolDefs.stream()
                    .map(this::convertToGatewayToolDefinition)
                    .toList();
            log.debug("Including {} tools in request: {}",
                    tools.size(), toolDefs.stream()
                            .map(com.insuretech.pms.chat.tool.ToolDefinition::getName)
                            .toList());
        }

        String engine = request.getEngine();
        if (!StringUtils.hasText(engine)) {
            engine = "auto";
        }

        return GatewayRequest.builder()
                .traceId(traceId)
                .engine(engine)
                .stream(true)
                .messages(messages)
                .tools(tools)
                .generation(request.getGeneration())
                .build();
    }

    private String buildSystemPrompt(ChatStreamRequest request) {
        StringBuilder prompt = new StringBuilder(
                "You are a helpful assistant for insurance project management.");

        if (request.isEnableTools() && toolRegistry.hasTools()) {
            prompt.append(" You have access to tools that can help you perform tasks. ")
                    .append("Use them when appropriate to get real-time data.");
        }

        if (StringUtils.hasText(request.getUserRole())) {
            prompt.append(" The user's role is: ").append(request.getUserRole()).append(".");
        }

        return prompt.toString();
    }

    private Mono<R2dbcChatSession> getOrCreateSession(String sessionId, String userId) {
        if (StringUtils.hasText(sessionId)) {
            return sessionRepository.findByIdAndActiveTrue(sessionId)
                    .switchIfEmpty(Mono.error(ChatException.sessionNotFound(sessionId)));
        }

        R2dbcChatSession newSession = R2dbcChatSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .title("New Chat")
                .active(true)
                .build();
        newSession.setCreatedAt(LocalDateTime.now());

        return sessionRepository.save(newSession)
                .doOnSuccess(session -> log.debug("Created new session: id={}, user={}",
                        session.getId(), userId));
    }

    private Mono<R2dbcChatMessage> saveUserMessage(String sessionId, String message) {
        R2dbcChatMessage userMessage = R2dbcChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .role(R2dbcChatMessage.Role.USER.name())
                .content(message)
                .build();
        userMessage.setCreatedAt(LocalDateTime.now());

        return messageRepository.save(userMessage);
    }

    private Mono<R2dbcChatMessage> saveAssistantMessage(String sessionId, String reply) {
        R2dbcChatMessage assistantMessage = R2dbcChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .role(R2dbcChatMessage.Role.ASSISTANT.name())
                .content(reply)
                .build();
        assistantMessage.setCreatedAt(LocalDateTime.now());

        return messageRepository.save(assistantMessage);
    }

    private Mono<R2dbcChatMessage> saveAssistantMessageWithTrace(
            String sessionId, String reply, String traceId, String engine) {
        R2dbcChatMessage assistantMessage = R2dbcChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .role(R2dbcChatMessage.Role.ASSISTANT.name())
                .content(reply)
                .traceId(traceId)
                .engine(engine)
                .build();
        assistantMessage.setCreatedAt(LocalDateTime.now());

        return messageRepository.save(assistantMessage);
    }

    private Flux<R2dbcChatMessage> getRecentMessages(String sessionId, int limit) {
        return messageRepository.findRecentBySessionId(sessionId, limit)
                .sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));
    }

    private Mono<Boolean> cacheMessages(String sessionId, R2dbcChatMessage userMessage) {
        String redisKey = "chat:session:" + sessionId;
        return reactiveRedisTemplate.opsForList().rightPush(redisKey, userMessage.getContent())
                .then(reactiveRedisTemplate.expire(redisKey, CACHE_TTL));
    }

    private AIChatContext buildContext(String userId, ChatRequest request, List<R2dbcChatMessage> recentMessages) {
        return AIChatContext.builder()
                .userId(userId)
                .message(request.getMessage())
                .recentMessages(recentMessages)
                .projectId(request.getProjectId())
                .userRole(request.getUserRole())
                .userAccessLevel(request.getUserAccessLevel())
                .build();
    }

    private List<R2dbcChatMessage> toJpaMessages(List<R2dbcChatMessage> r2dbcMessages) {
        // R2DBC messages are already in the correct format
        return r2dbcMessages;
    }

    private java.util.Optional<String> extractDeltaText(String deltaJson) {
        try {
            // Simple extraction - look for "text" field in delta JSON
            if (deltaJson.contains("\"text\":")) {
                int start = deltaJson.indexOf("\"text\":\"") + 8;
                int end = deltaJson.indexOf("\"", start);
                if (start > 7 && end > start) {
                    return java.util.Optional.of(deltaJson.substring(start, end)
                            .replace("\\n", "\n")
                            .replace("\\\"", "\"")
                            .replace("\\\\", "\\"));
                }
            }
        } catch (Exception e) {
            log.trace("Failed to extract delta text: {}", e.getMessage());
        }
        return java.util.Optional.empty();
    }
}
