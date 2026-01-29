package com.insuretech.pms.chat.service;

import com.insuretech.pms.chat.dto.AIChatContext;
import com.insuretech.pms.chat.dto.ChatChunk;
import com.insuretech.pms.chat.dto.ChatMessageDto;
import com.insuretech.pms.chat.dto.ChatRequest;
import com.insuretech.pms.chat.dto.ChatResponse;
import com.insuretech.pms.chat.dto.ChatStreamRequest;
import com.insuretech.pms.chat.dto.sse.SseEventBuilder;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.gateway.LlmGatewayService;
import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatMessageRepository;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveChatService {

    private final ReactiveChatSessionRepository sessionRepository;
    private final ReactiveChatMessageRepository messageRepository;
    private final ReactiveAIChatClient reactiveAIChatClient;
    private final ReactiveRedisTemplate<String, Object> reactiveRedisTemplate;
    private final TransactionalOperator transactionalOperator;
    private final LlmGatewayService llmGatewayService;
    private final SseEventBuilder sseBuilder;

    public Flux<ChatChunk> streamChat(ChatRequest request, String userId) {
        AtomicReference<StringBuilder> contentAccumulator = new AtomicReference<>(new StringBuilder());

        return getOrCreateSession(request.getSessionId(), userId)
                .flatMapMany(session -> {
                    // Save user message
                    return saveUserMessage(session.getId(), request.getMessage())
                            .flatMapMany(userMessage -> {
                                // Get recent messages for context
                                return getRecentMessages(session.getId(), 10)
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
                                                                            error -> log.error("Failed to save: {}", error.getMessage())
                                                                    );
                                                        }
                                                    });
                                        });
                            });
                })
                .onErrorResume(e -> {
                    log.error("Stream chat error: {}", e.getMessage());
                    return Flux.just(ChatChunk.error(
                            request.getSessionId(), "error", "Chat error: " + e.getMessage()));
                });
    }

    /**
     * Stream chat using Standard SSE Contract (v2)
     * Events: meta, delta, done, error
     */
    public Flux<ServerSentEvent<String>> streamChatV2(ChatStreamRequest request, String userId) {
        String traceId = UUID.randomUUID().toString();
        AtomicReference<StringBuilder> contentAccumulator = new AtomicReference<>(new StringBuilder());
        AtomicReference<String> sessionIdRef = new AtomicReference<>();

        return getOrCreateSession(request.getSessionId(), userId)
                .flatMapMany(session -> {
                    sessionIdRef.set(session.getId());
                    log.info("StreamV2: traceId={}, session={}, user={}", traceId, session.getId(), userId);

                    return saveUserMessage(session.getId(), request.getMessage())
                            .flatMapMany(userMessage -> {
                                // Get recent messages for context
                                return getRecentMessages(session.getId(), 10)
                                        .collectList()
                                        .flatMapMany(recentMessages -> {
                                            // Build gateway request
                                            GatewayRequest gatewayRequest = buildGatewayRequest(
                                                    traceId, request, recentMessages);

                                            return llmGatewayService.streamChat(gatewayRequest)
                                                    .doOnNext(event -> {
                                                        // Track engine from meta event
                                                        if ("meta".equals(event.event())) {
                                                            // Engine info is in meta event
                                                        }
                                                        // Accumulate content from delta events
                                                        if ("delta".equals(event.event())) {
                                                            String data = event.data();
                                                            if (data != null) {
                                                                // Extract text content from delta JSON
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
                                                                    saved -> log.debug("Saved assistant message: {}", saved.getId()),
                                                                    error -> log.error("Failed to save: {}", error.getMessage())
                                                            );
                                                        }
                                                    });
                                        });
                            });
                })
                .onErrorResume(e -> {
                    log.error("StreamV2 error: traceId={}, error={}", traceId, e.getMessage());
                    return Flux.just(sseBuilder.error("STREAM_ERROR", e.getMessage(), traceId));
                });
    }

    private GatewayRequest buildGatewayRequest(String traceId, ChatStreamRequest request,
                                               List<R2dbcChatMessage> recentMessages) {
        List<ChatMessageDto> messages = new ArrayList<>();

        // Add system prompt if needed
        messages.add(ChatMessageDto.builder()
                .role("system")
                .content("You are a helpful assistant for insurance project management.")
                .build());

        // Add conversation history
        for (R2dbcChatMessage msg : recentMessages) {
            messages.add(ChatMessageDto.builder()
                    .role(msg.getRole() != null ? msg.getRole().toLowerCase() : "user")
                    .content(msg.getContent())
                    .build());
        }

        // Add current user message
        messages.add(ChatMessageDto.builder()
                .role("user")
                .content(request.getMessage())
                .build());

        // Add RAG context if available
        if (request.getRetrievedDocs() != null && !request.getRetrievedDocs().isEmpty()) {
            String ragContext = String.join("\n\n", request.getRetrievedDocs());
            messages.add(0, ChatMessageDto.builder()
                    .role("system")
                    .content("Context from retrieved documents:\n" + ragContext)
                    .build());
        }

        return GatewayRequest.builder()
                .traceId(traceId)
                .engine(request.getEngine() != null ? request.getEngine() : "auto")
                .stream(true)
                .messages(messages)
                .generation(request.getGeneration())
                .build();
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

    public Mono<ChatResponse> sendMessage(ChatRequest request, String userId) {
        return getOrCreateSession(request.getSessionId(), userId)
                .flatMap(session ->
                        saveUserMessage(session.getId(), request.getMessage())
                                .flatMap(userMessage ->
                                        getRecentMessages(session.getId(), 10)
                                                .collectList()
                                                .flatMap(recentMessages -> {
                                                    AIChatContext context = buildContext(
                                                            userId, request, toJpaMessages(recentMessages));

                                                    return reactiveAIChatClient.chat(context)
                                                            .flatMap(response -> saveAssistantMessage(session.getId(), response.getReply())
                                                                    .then(cacheMessages(session.getId(), userMessage))
                                                                    .thenReturn(response))
                                                            .map(response -> {
                                                                response.setSessionId(session.getId());
                                                                return response;
                                                            });
                                                })
                                )
                )
                .as(transactionalOperator::transactional);
    }

    private Mono<R2dbcChatSession> getOrCreateSession(String sessionId, String userId) {
        if (sessionId != null && !sessionId.isEmpty()) {
            return sessionRepository.findByIdAndActiveTrue(sessionId)
                    .switchIfEmpty(Mono.error(new IllegalArgumentException("Session not found: " + sessionId)));
        }

        R2dbcChatSession newSession = R2dbcChatSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .title("New Chat")
                .active(true)
                .build();
        newSession.setCreatedAt(LocalDateTime.now());

        return sessionRepository.save(newSession);
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

    private Flux<R2dbcChatMessage> getRecentMessages(String sessionId, int limit) {
        return messageRepository.findRecentBySessionId(sessionId, limit)
                .sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));
    }

    private Mono<Boolean> cacheMessages(String sessionId, R2dbcChatMessage userMessage) {
        String redisKey = "chat:session:" + sessionId;
        return reactiveRedisTemplate.opsForList().rightPush(redisKey, userMessage.getContent())
                .then(reactiveRedisTemplate.expire(redisKey, Duration.ofHours(1)));
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
        // R2DBC messages are already in the correct format, just return them
        return r2dbcMessages;
    }

    public Flux<R2dbcChatMessage> getHistory(String sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public Mono<Void> deleteSession(String sessionId) {
        return sessionRepository.deactivateSession(sessionId)
                .then(reactiveRedisTemplate.delete("chat:session:" + sessionId))
                .then();
    }

    public Flux<R2dbcChatSession> getUserSessions(String userId) {
        return sessionRepository.findByUserIdAndActiveTrue(userId);
    }
}
