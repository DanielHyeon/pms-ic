package com.insuretech.pms.chat.ab;

import com.insuretech.pms.chat.dto.sse.*;
import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import com.insuretech.pms.chat.gateway.dto.WorkerRequest;
import com.insuretech.pms.chat.gateway.EngineRouter;
import com.insuretech.pms.chat.gateway.OpenAiSseTransformer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Service for A/B testing between LLM engines
 * Streams primary response to user while collecting shadow response in background
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ABTestService {

    private final WebClient.Builder webClientBuilder;
    private final EngineRouter engineRouter;
    private final OpenAiSseTransformer transformer;
    private final SseEventBuilder sseBuilder;
    private final ReactiveRedisTemplate<String, Object> redisTemplate;

    // In-memory cache for recent A/B results (for quick access)
    private final Map<String, ABTestResult> resultCache = new ConcurrentHashMap<>();

    @Value("${llm.gateway.timeout.total:90}")
    private int timeoutSeconds;

    private static final String AB_RESULTS_KEY_PREFIX = "ab:result:";
    private static final Duration AB_RESULT_TTL = Duration.ofDays(7);

    /**
     * Execute A/B test - stream primary to user, collect shadow in background
     */
    public Flux<ServerSentEvent<String>> executeABTest(GatewayRequest request) {
        String traceId = request.getTraceId();
        String primaryEngine = request.getAb() != null && request.getAb().getPrimary() != null
                ? request.getAb().getPrimary() : "vllm";
        String shadowEngine = request.getAb() != null && request.getAb().getShadow() != null
                ? request.getAb().getShadow() : "gguf";

        log.info("Starting A/B test: traceId={}, primary={}, shadow={}", traceId, primaryEngine, shadowEngine);

        // Initialize result tracking
        ABTestResult result = ABTestResult.create(traceId, null, null, primaryEngine, shadowEngine);
        result.setInputLength(request.estimateContextLength());
        resultCache.put(traceId, result);

        // Start shadow stream in background (fire and forget)
        startShadowStream(request, shadowEngine, result)
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe();

        // Return primary stream to user
        return streamFromEngine(request, primaryEngine, traceId, true, result);
    }

    private Flux<ServerSentEvent<String>> streamFromEngine(
            GatewayRequest request,
            String engine,
            String traceId,
            boolean isPrimary,
            ABTestResult result) {

        String workerUrl = engineRouter.getWorkerUrl(engine);
        String modelName = engineRouter.getModelName(engine);

        WorkerRequest workerRequest = buildWorkerRequest(request, modelName);

        Instant startTime = Instant.now();
        AtomicReference<Instant> firstTokenTime = new AtomicReference<>();
        AtomicReference<StringBuilder> contentAccumulator = new AtomicReference<>(new StringBuilder());

        WebClient webClient = webClientBuilder.build();

        // Meta event for primary only
        Flux<ServerSentEvent<String>> metaFlux = isPrimary
                ? Flux.just(sseBuilder.meta(MetaEvent.builder()
                        .traceId(traceId)
                        .engine(engine)
                        .model(modelName)
                        .mode("ab")
                        .timestamp(startTime)
                        .build()))
                : Flux.empty();

        Flux<ServerSentEvent<String>> contentFlux = webClient.post()
                .uri(workerUrl + "/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(workerRequest)
                .retrieve()
                .bodyToFlux(String.class)
                .transform(transformer::transformOpenAiSse)
                .doOnNext(event -> {
                    if (firstTokenTime.get() == null) {
                        firstTokenTime.set(Instant.now());
                    }
                    if ("delta".equals(event.event())) {
                        extractText(event.data()).ifPresent(text -> contentAccumulator.get().append(text));
                    }
                })
                .doOnComplete(() -> {
                    long ttft = firstTokenTime.get() != null
                            ? Duration.between(startTime, firstTokenTime.get()).toMillis()
                            : 0;
                    long total = Duration.between(startTime, Instant.now()).toMillis();
                    String content = contentAccumulator.get().toString();

                    if (isPrimary) {
                        result.completePrimary(content, ttft, total, estimateTokens(content));
                        log.info("A/B primary complete: traceId={}, ttft={}ms, total={}ms",
                                traceId, ttft, total);
                    } else {
                        result.completeShadow(content, ttft, total, estimateTokens(content));
                        log.info("A/B shadow complete: traceId={}, ttft={}ms, total={}ms",
                                traceId, ttft, total);
                    }

                    // Save result when both complete
                    if (result.isComplete()) {
                        saveResult(result).subscribe();
                    }
                })
                .doOnError(error -> {
                    if (isPrimary) {
                        result.failPrimary(error.getMessage());
                    } else {
                        result.failShadow(error.getMessage());
                    }
                    log.error("A/B {} failed: traceId={}, error={}",
                            isPrimary ? "primary" : "shadow", traceId, error.getMessage());
                })
                .timeout(Duration.ofSeconds(timeoutSeconds));

        return Flux.concat(metaFlux, contentFlux);
    }

    private Mono<Void> startShadowStream(GatewayRequest request, String shadowEngine, ABTestResult result) {
        return streamFromEngine(request, shadowEngine, request.getTraceId(), false, result)
                .then()
                .onErrorResume(e -> {
                    log.error("Shadow stream error: {}", e.getMessage());
                    return Mono.empty();
                });
    }

    private WorkerRequest buildWorkerRequest(GatewayRequest request, String model) {
        List<WorkerRequest.WorkerMessage> messages = request.getMessages().stream()
                .map(msg -> WorkerRequest.WorkerMessage.builder()
                        .role(msg.getRole())
                        .content(msg.getContent())
                        .build())
                .toList();

        WorkerRequest.WorkerRequestBuilder builder = WorkerRequest.builder()
                .model(model)
                .messages(messages)
                .stream(true);

        if (request.getGeneration() != null) {
            builder.temperature(request.getGeneration().getTemperature())
                    .maxTokens(request.getGeneration().getMaxTokens())
                    .topP(request.getGeneration().getTopP());
        }

        return builder.build();
    }

    private Mono<Boolean> saveResult(ABTestResult result) {
        String key = AB_RESULTS_KEY_PREFIX + result.getTraceId();
        return redisTemplate.opsForValue()
                .set(key, result, AB_RESULT_TTL)
                .doOnSuccess(saved -> log.info("Saved A/B result: traceId={}", result.getTraceId()))
                .doOnError(e -> log.error("Failed to save A/B result: {}", e.getMessage()));
    }

    public Mono<ABTestResult> getResult(String traceId) {
        // Check memory cache first
        ABTestResult cached = resultCache.get(traceId);
        if (cached != null && cached.isComplete()) {
            return Mono.just(cached);
        }

        // Fall back to Redis
        String key = AB_RESULTS_KEY_PREFIX + traceId;
        return redisTemplate.opsForValue()
                .get(key)
                .cast(ABTestResult.class);
    }

    private java.util.Optional<String> extractText(String deltaJson) {
        try {
            if (deltaJson != null && deltaJson.contains("\"text\":")) {
                int start = deltaJson.indexOf("\"text\":\"") + 8;
                int end = deltaJson.indexOf("\"", start);
                if (start > 7 && end > start) {
                    return java.util.Optional.of(deltaJson.substring(start, end));
                }
            }
        } catch (Exception ignored) {}
        return java.util.Optional.empty();
    }

    private int estimateTokens(String text) {
        // Rough estimation: ~4 chars per token
        return text != null ? text.length() / 4 : 0;
    }
}
