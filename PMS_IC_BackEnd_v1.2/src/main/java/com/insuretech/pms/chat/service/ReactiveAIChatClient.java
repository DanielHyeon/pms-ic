package com.insuretech.pms.chat.service;

import com.insuretech.pms.chat.dto.AIChatContext;
import com.insuretech.pms.chat.dto.ChatChunk;
import com.insuretech.pms.chat.dto.ChatResponse;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveAIChatClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    @Value("${ai.service.timeout:30000}")
    private long timeout;

    public Flux<ChatChunk> streamChat(AIChatContext context) {
        return streamChat(
                context.getUserId(),
                context.getMessage(),
                context.getRecentMessages(),
                context.getProjectId(),
                context.getUserRole(),
                context.getUserAccessLevel()
        );
    }

    public Flux<ChatChunk> streamChat(
            String userId,
            String message,
            List<R2dbcChatMessage> chatHistory,
            String projectId,
            String userRole,
            Integer userAccessLevel
    ) {
        String sessionId = UUID.randomUUID().toString();
        AtomicInteger chunkCounter = new AtomicInteger(0);

        Map<String, Object> request = buildRequest(
                message, chatHistory, userId, projectId, userRole, userAccessLevel);

        log.info("Starting streaming chat request: project={}, role={}, level={}",
                projectId, userRole, userAccessLevel);

        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.post()
                .uri("/api/chat/v2/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<Map<String, Object>>>() {})
                .timeout(Duration.ofMillis(timeout))
                .map(sse -> mapToChunk(sse, sessionId, chunkCounter))
                .onErrorResume(e -> {
                    log.error("Streaming chat error: {}", e.getMessage());
                    return Flux.just(ChatChunk.error(
                            sessionId,
                            String.valueOf(chunkCounter.incrementAndGet()),
                            "Streaming error: " + e.getMessage()
                    ));
                });
    }

    public Mono<ChatResponse> chat(AIChatContext context) {
        Map<String, Object> request = buildRequest(
                context.getMessage(),
                context.getRecentMessages(),
                context.getUserId(),
                context.getProjectId(),
                context.getUserRole(),
                context.getUserAccessLevel()
        );

        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.post()
                .uri("/api/chat/v2")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .timeout(Duration.ofMillis(timeout))
                .map(this::mapToChatResponse)
                .onErrorResume(e -> {
                    log.error("Chat error: {}", e.getMessage());
                    return Mono.just(ChatResponse.builder()
                            .reply("Error: " + e.getMessage())
                            .confidence(0.0)
                            .build());
                });
    }

    private Map<String, Object> buildRequest(
            String message,
            List<R2dbcChatMessage> chatHistory,
            String userId,
            String projectId,
            String userRole,
            Integer userAccessLevel
    ) {
        List<Map<String, String>> contextList = chatHistory.stream()
                .map(msg -> Map.of(
                        "role", msg.getRole().toLowerCase(),
                        "content", msg.getContent()
                ))
                .toList();

        Map<String, Object> request = new HashMap<>();
        request.put("message", message);
        request.put("context", contextList);
        request.put("retrieved_docs", List.of());

        if (userId != null) request.put("user_id", userId);
        if (projectId != null) request.put("project_id", projectId);
        if (userRole != null) request.put("user_role", userRole);
        if (userAccessLevel != null) request.put("user_access_level", userAccessLevel);

        return request;
    }

    private ChatChunk mapToChunk(
            ServerSentEvent<Map<String, Object>> sse,
            String sessionId,
            AtomicInteger counter
    ) {
        Map<String, Object> data = sse.data();
        if (data == null) {
            return ChatChunk.token(sessionId, String.valueOf(counter.incrementAndGet()), "");
        }

        String chunkId = String.valueOf(counter.incrementAndGet());
        String content = (String) data.getOrDefault("chunk", "");
        Boolean done = (Boolean) data.getOrDefault("done", false);
        Double confidence = data.get("confidence") != null
                ? ((Number) data.get("confidence")).doubleValue()
                : null;

        if (Boolean.TRUE.equals(done)) {
            return ChatChunk.done(sessionId, chunkId, confidence);
        }

        return ChatChunk.token(sessionId, chunkId, content);
    }

    @SuppressWarnings("unchecked")
    private ChatResponse mapToChatResponse(Map<String, Object> response) {
        return ChatResponse.builder()
                .reply((String) response.get("reply"))
                .confidence(response.get("confidence") != null
                        ? ((Number) response.get("confidence")).doubleValue()
                        : 0.9)
                .suggestions((List<String>) response.getOrDefault("suggestions", List.of()))
                .build();
    }
}
