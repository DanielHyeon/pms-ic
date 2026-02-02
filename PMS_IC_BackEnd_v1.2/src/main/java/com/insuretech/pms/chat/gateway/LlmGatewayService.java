package com.insuretech.pms.chat.gateway;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.ab.ABTestService;
import com.insuretech.pms.chat.dto.sse.*;
import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import com.insuretech.pms.chat.gateway.dto.ToolDefinition;
import com.insuretech.pms.chat.gateway.dto.WorkerRequest;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import io.github.resilience4j.reactor.retry.RetryOperator;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry.RetrySignal;

import java.net.ConnectException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * LLM Gateway Service - Routes requests to LLM workers with resilience patterns.
 *
 * <p>Features:</p>
 * <ul>
 *   <li>Circuit breaker pattern for fast failure during outages</li>
 *   <li>Retry with exponential backoff for transient failures</li>
 *   <li>Automatic fallback to alternate engine when primary fails</li>
 *   <li>Comprehensive request/response logging for debugging</li>
 *   <li>Metrics collection for monitoring</li>
 * </ul>
 */
@Slf4j
@Service
public class LlmGatewayService {

    private final EngineRouter engineRouter;
    private final OpenAiSseTransformer transformer;
    private final SseEventBuilder sseBuilder;
    private final WebClient webClient;
    private final HealthChecker healthChecker;
    private final MeterRegistry meterRegistry;
    private final ABTestService abTestService;
    private final RateLimiter rateLimiter;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final RetryRegistry retryRegistry;
    private final ObjectMapper objectMapper;

    @Value("${llm.gateway.timeout.total:120}")
    private int totalTimeoutSeconds;

    @Value("${llm.gateway.timeout.ttft:15}")
    private int ttftTimeoutSeconds;

    @Value("${llm.gateway.timeout.report:300}")
    private int reportTimeoutSeconds;

    @Value("${llm.gateway.logging.request-body:false}")
    private boolean logRequestBody;

    @Value("${llm.gateway.logging.response-content:false}")
    private boolean logResponseContent;

    @Value("${llm.gateway.fallback.enabled:true}")
    private boolean fallbackEnabled;

    @Value("${llm.gateway.retry.enabled:true}")
    private boolean retryEnabled;

    public LlmGatewayService(
            EngineRouter engineRouter,
            OpenAiSseTransformer transformer,
            SseEventBuilder sseBuilder,
            WebClient.Builder webClientBuilder,
            HealthChecker healthChecker,
            MeterRegistry meterRegistry,
            @Lazy ABTestService abTestService,
            RateLimiter rateLimiter,
            CircuitBreakerRegistry circuitBreakerRegistry,
            RetryRegistry retryRegistry,
            ObjectMapper objectMapper) {
        this.engineRouter = engineRouter;
        this.transformer = transformer;
        this.sseBuilder = sseBuilder;
        this.webClient = webClientBuilder.build();
        this.healthChecker = healthChecker;
        this.meterRegistry = meterRegistry;
        this.abTestService = abTestService;
        this.rateLimiter = rateLimiter;
        this.circuitBreakerRegistry = circuitBreakerRegistry;
        this.retryRegistry = retryRegistry;
        this.objectMapper = objectMapper;
    }

    public Flux<ServerSentEvent<String>> streamChat(GatewayRequest request) {
        return streamChat(request, null);
    }

    /**
     * Stream chat with optional user ID for per-user rate limiting.
     * Includes circuit breaker, retry, and fallback mechanisms.
     */
    public Flux<ServerSentEvent<String>> streamChat(GatewayRequest request, String userId) {
        String traceId = request.getTraceId();
        Instant startTime = Instant.now();

        logRequest(traceId, request, userId);

        // Handle A/B mode
        if ("ab".equalsIgnoreCase(request.getEngine())) {
            log.info("[{}] A/B mode requested", traceId);
            return abTestService.executeABTest(request);
        }

        try {
            String primaryEngine = engineRouter.selectEngine(request);
            return executeWithResilience(request, userId, traceId, startTime, primaryEngine, true);

        } catch (EngineUnavailableException e) {
            log.error("[{}] No engine available for request", traceId);
            recordError("none");
            return Flux.just(sseBuilder.error(ErrorEvent.engineUnavailable(traceId)));
        } catch (Exception e) {
            log.error("[{}] Gateway error during engine selection: {}", traceId, e.getMessage(), e);
            recordError("unknown");
            return Flux.just(sseBuilder.error("GATEWAY_ERROR", e.getMessage(), traceId));
        }
    }

    /**
     * Execute request with circuit breaker, retry, and fallback support.
     */
    private Flux<ServerSentEvent<String>> executeWithResilience(
            GatewayRequest request,
            String userId,
            String traceId,
            Instant startTime,
            String engine,
            boolean allowFallback) {

        String workerUrl = engineRouter.getWorkerUrl(engine);
        String modelName = engineRouter.getModelName(engine);

        log.info("[{}] Stream request: engine={}, model={}, user={}, fallback={}",
                traceId, engine, modelName, userId, allowFallback);
        recordEngineSelection(engine);

        // Get circuit breaker and retry for this engine
        CircuitBreaker circuitBreaker = getCircuitBreaker(engine);
        Retry retry = getRetry(engine);

        // Check circuit breaker state before proceeding
        if (circuitBreaker.getState() == CircuitBreaker.State.OPEN) {
            log.warn("[{}] Circuit breaker OPEN for engine {}, attempting fallback", traceId, engine);
            recordCircuitBreakerOpen(engine);

            if (allowFallback && fallbackEnabled) {
                return attemptFallback(request, userId, traceId, startTime, engine);
            }
            return Flux.just(sseBuilder.error("CIRCUIT_OPEN",
                    "Service temporarily unavailable, circuit breaker is open for " + engine, traceId));
        }

        // Acquire rate limit permit before streaming
        return rateLimiter.acquire(engine, userId)
                .flatMapMany(permit -> {
                    try {
                        WorkerRequest workerRequest = buildWorkerRequest(request, modelName, engine);
                        logWorkerRequest(traceId, engine, workerRequest);

                        ServerSentEvent<String> metaEvent = sseBuilder.meta(MetaEvent.builder()
                                .traceId(traceId)
                                .engine(engine)
                                .model(modelName)
                                .mode("chat")
                                .timestamp(startTime)
                                .build());

                        Flux<ServerSentEvent<String>> workerStream = streamFromWorkerWithResilience(
                                workerUrl, workerRequest, traceId, engine, startTime,
                                circuitBreaker, retry
                        ).doFinally(signal -> rateLimiter.release(permit));

                        // Handle fallback on error
                        Flux<ServerSentEvent<String>> streamWithFallback = workerStream
                                .onErrorResume(error -> {
                                    if (allowFallback && fallbackEnabled && isRetryableError(error)) {
                                        log.warn("[{}] Primary engine {} failed, attempting fallback: {}",
                                                traceId, engine, error.getMessage());
                                        return attemptFallback(request, userId, traceId, startTime, engine);
                                    }
                                    return handleStreamError(traceId, engine, error);
                                });

                        return Flux.concat(
                                Flux.just(metaEvent),
                                streamWithFallback
                        );
                    } catch (Exception e) {
                        rateLimiter.release(permit);
                        throw e;
                    }
                })
                .onErrorResume(RateLimiter.RateLimitExceededException.class, e -> {
                    log.warn("[{}] Rate limit exceeded: {}", traceId, e.getMessage());
                    recordRateLimitExceeded(engine);
                    return Flux.just(sseBuilder.error("RATE_LIMIT_EXCEEDED", e.getMessage(), traceId));
                });
    }

    /**
     * Stream from worker with circuit breaker and retry operators.
     */
    private Flux<ServerSentEvent<String>> streamFromWorkerWithResilience(
            String workerUrl,
            WorkerRequest request,
            String traceId,
            String engine,
            Instant startTime,
            CircuitBreaker circuitBreaker,
            Retry retry) {

        AtomicBoolean firstToken = new AtomicBoolean(false);
        AtomicInteger tokenCount = new AtomicInteger(0);

        Flux<ServerSentEvent<String>> baseStream = webClient.post()
                .uri(workerUrl + "/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class)
                .doOnSubscribe(s -> log.debug("[{}] Connecting to worker: {}", traceId, workerUrl))
                .transform(transformer::transformOpenAiSse)
                .doOnNext(event -> {
                    int count = tokenCount.incrementAndGet();
                    if (!firstToken.getAndSet(true)) {
                        long ttft = Duration.between(startTime, Instant.now()).toMillis();
                        recordTTFT(engine, ttft);
                        healthChecker.markHealthy(engine);
                        log.debug("[{}] TTFT: engine={}, ttft={}ms", traceId, engine, ttft);
                    }
                    if (logResponseContent && count <= 5) {
                        logResponseEvent(traceId, event);
                    }
                })
                .doOnComplete(() -> {
                    long totalTime = Duration.between(startTime, Instant.now()).toMillis();
                    recordTotalTime(engine, totalTime);
                    recordSuccess(engine);
                    log.info("[{}] Stream complete: engine={}, totalTime={}ms, tokens={}",
                            traceId, engine, totalTime, tokenCount.get());
                })
                .doOnError(e -> {
                    recordError(engine);
                    healthChecker.markUnhealthy(engine);
                    log.error("[{}] Stream error: engine={}, error={}, type={}",
                            traceId, engine, e.getMessage(), e.getClass().getSimpleName());
                })
                .timeout(Duration.ofSeconds(totalTimeoutSeconds));

        // Apply retry operator for transient failures (only for non-streaming initial connection)
        if (retryEnabled) {
            baseStream = baseStream.transformDeferred(RetryOperator.of(retry));
        }

        // Apply circuit breaker operator
        return baseStream.transformDeferred(CircuitBreakerOperator.of(circuitBreaker));
    }

    /**
     * Attempt fallback to an alternate engine when primary fails.
     */
    private Flux<ServerSentEvent<String>> attemptFallback(
            GatewayRequest request,
            String userId,
            String traceId,
            Instant startTime,
            String failedEngine) {

        String fallbackEngine = getFallbackEngine(failedEngine);

        if (fallbackEngine == null) {
            log.error("[{}] No fallback engine available after {} failure", traceId, failedEngine);
            return Flux.just(sseBuilder.error("NO_FALLBACK",
                    "No alternate engine available after " + failedEngine + " failure", traceId));
        }

        log.info("[{}] Falling back from {} to {}", traceId, failedEngine, fallbackEngine);
        recordFallback(failedEngine, fallbackEngine);

        // Execute with fallback engine, but don't allow further fallback to prevent loops
        return executeWithResilience(request, userId, traceId, startTime, fallbackEngine, false);
    }

    /**
     * Get fallback engine for a failed engine.
     */
    private String getFallbackEngine(String failedEngine) {
        String fallback = "vllm".equals(failedEngine) ? "gguf" : "vllm";

        if (engineRouter.isEngineEnabled(fallback) && healthChecker.isHealthy(fallback)) {
            CircuitBreaker cb = getCircuitBreaker(fallback);
            if (cb.getState() != CircuitBreaker.State.OPEN) {
                return fallback;
            }
            log.debug("Fallback engine {} has open circuit breaker", fallback);
        }

        return null;
    }

    /**
     * Handle stream errors with appropriate error responses.
     */
    private Flux<ServerSentEvent<String>> handleStreamError(String traceId, String engine, Throwable error) {
        log.error("[{}] Handling stream error for engine {}: {} ({})",
                traceId, engine, error.getMessage(), error.getClass().getSimpleName());

        if (error instanceof CallNotPermittedException) {
            return Flux.just(sseBuilder.error("CIRCUIT_OPEN",
                    "Circuit breaker is open for engine " + engine, traceId));
        }

        if (error instanceof WebClientResponseException responseEx) {
            int status = responseEx.getStatusCode().value();
            String body = responseEx.getResponseBodyAsString();
            log.error("[{}] Worker HTTP error: status={}, body={}", traceId, status, truncate(body, 500));
            return Flux.just(sseBuilder.error("WORKER_ERROR",
                    "Worker returned HTTP " + status, traceId));
        }

        if (error instanceof WebClientRequestException || error instanceof ConnectException) {
            return Flux.just(sseBuilder.error("CONNECTION_ERROR",
                    "Failed to connect to " + engine + " worker", traceId));
        }

        if (error instanceof TimeoutException ||
            (error.getMessage() != null && error.getMessage().contains("timeout"))) {
            return Flux.just(sseBuilder.error(ErrorEvent.timeout(traceId)));
        }

        return Flux.just(sseBuilder.error("STREAM_ERROR", error.getMessage(), traceId));
    }

    /**
     * Determine if an error is retryable (transient failure).
     */
    private boolean isRetryableError(Throwable error) {
        if (error instanceof ConnectException || error instanceof WebClientRequestException) {
            return true;
        }
        if (error instanceof WebClientResponseException responseEx) {
            int status = responseEx.getStatusCode().value();
            // Retry on 5xx errors except 501 Not Implemented
            return status >= 500 && status < 600 && status != 501;
        }
        if (error instanceof TimeoutException) {
            return true;
        }
        if (error instanceof CallNotPermittedException) {
            return true; // Circuit is open, try fallback
        }
        return false;
    }

    private WorkerRequest buildWorkerRequest(GatewayRequest request, String model, String engine) {
        List<WorkerRequest.WorkerMessage> workerMessages = request.getMessages().stream()
                .map(msg -> WorkerRequest.WorkerMessage.builder()
                        .role(msg.getRole())
                        .content(msg.getContent())
                        .name(msg.getName())
                        .toolCallId(msg.getToolCallId())
                        .toolCalls(msg.getToolCalls())
                        .build())
                .toList();

        WorkerRequest.WorkerRequestBuilder builder = WorkerRequest.builder()
                .model(model)
                .messages(workerMessages)
                .stream(true);

        if (request.getGeneration() != null) {
            builder.temperature(request.getGeneration().getTemperature())
                    .maxTokens(request.getGeneration().getMaxTokens())
                    .topP(request.getGeneration().getTopP())
                    .stop(request.getGeneration().getStop());
        }

        if (request.getTools() != null && !request.getTools().isEmpty()
                && engineRouter.supportsToolCalling(engine)) {
            builder.tools(ToolDefinition.toMapList(request.getTools()));
            log.debug("Including {} tools in request for engine {}", request.getTools().size(), engine);
        }

        if (request.getResponseFormat() != null
                && engineRouter.supportsJsonSchema(engine)) {
            builder.responseFormat(request.getResponseFormat().toMap());
            log.debug("Including response_format in request for engine {}", engine);
        }

        return builder.build();
    }

    // ========== Logging Methods ==========

    private void logRequest(String traceId, GatewayRequest request, String userId) {
        log.info("[{}] Incoming request: engine={}, stream={}, messageCount={}, user={}, hasTools={}, hasFormat={}",
                traceId,
                request.getEngine(),
                request.isStream(),
                request.getMessages() != null ? request.getMessages().size() : 0,
                userId,
                request.hasTools(),
                request.hasResponseFormat());

        if (logRequestBody && log.isDebugEnabled()) {
            try {
                String body = objectMapper.writeValueAsString(request);
                log.debug("[{}] Request body: {}", traceId, truncate(body, 2000));
            } catch (JsonProcessingException e) {
                log.debug("[{}] Failed to serialize request body: {}", traceId, e.getMessage());
            }
        }
    }

    private void logWorkerRequest(String traceId, String engine, WorkerRequest request) {
        log.debug("[{}] Worker request: engine={}, model={}, messageCount={}, stream={}",
                traceId, engine, request.getModel(),
                request.getMessages() != null ? request.getMessages().size() : 0,
                request.isStream());

        if (logRequestBody && log.isTraceEnabled()) {
            try {
                String body = objectMapper.writeValueAsString(request);
                log.trace("[{}] Worker request body: {}", traceId, truncate(body, 5000));
            } catch (JsonProcessingException e) {
                log.trace("[{}] Failed to serialize worker request: {}", traceId, e.getMessage());
            }
        }
    }

    private void logResponseEvent(String traceId, ServerSentEvent<String> event) {
        if (log.isTraceEnabled()) {
            log.trace("[{}] SSE event: type={}, data={}",
                    traceId, event.event(), truncate(event.data(), 200));
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return "null";
        if (value.length() <= maxLength) return value;
        return value.substring(0, maxLength) + "...[truncated]";
    }

    // ========== Circuit Breaker and Retry Helpers ==========

    private CircuitBreaker getCircuitBreaker(String engine) {
        return circuitBreakerRegistry.circuitBreaker(engine + "-gateway");
    }

    private Retry getRetry(String engine) {
        return retryRegistry.retry(engine + "-gateway");
    }

    // ========== Metrics Recording ==========

    private void recordEngineSelection(String engine) {
        Counter.builder("llm.engine.selection")
                .tag("engine", engine)
                .register(meterRegistry)
                .increment();
    }

    private void recordTTFT(String engine, long ttftMs) {
        Timer.builder("llm.ttft")
                .tag("engine", engine)
                .register(meterRegistry)
                .record(ttftMs, TimeUnit.MILLISECONDS);
    }

    private void recordTotalTime(String engine, long totalMs) {
        Timer.builder("llm.total.time")
                .tag("engine", engine)
                .register(meterRegistry)
                .record(totalMs, TimeUnit.MILLISECONDS);
    }

    private void recordError(String engine) {
        Counter.builder("llm.errors")
                .tag("engine", engine)
                .register(meterRegistry)
                .increment();
    }

    private void recordSuccess(String engine) {
        Counter.builder("llm.success")
                .tag("engine", engine)
                .register(meterRegistry)
                .increment();
    }

    private void recordRateLimitExceeded(String engine) {
        Counter.builder("llm.rate_limit.exceeded")
                .tag("engine", engine)
                .register(meterRegistry)
                .increment();
    }

    private void recordCircuitBreakerOpen(String engine) {
        Counter.builder("llm.circuit_breaker.open")
                .tag("engine", engine)
                .register(meterRegistry)
                .increment();
    }

    private void recordFallback(String fromEngine, String toEngine) {
        Counter.builder("llm.fallback")
                .tag("from", fromEngine)
                .tag("to", toEngine)
                .register(meterRegistry)
                .increment();
    }
}
