package com.insuretech.pms.chat.gateway;

import com.insuretech.pms.chat.ab.ABTestService;
import com.insuretech.pms.chat.dto.sse.*;
import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import com.insuretech.pms.chat.gateway.dto.WorkerRequest;
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
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * LLM Gateway Service - Routes requests to LLM workers and transforms SSE responses
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

    @Value("${llm.gateway.timeout.total:90}")
    private int totalTimeoutSeconds;

    @Value("${llm.gateway.timeout.ttft:10}")
    private int ttftTimeoutSeconds;

    public LlmGatewayService(
            EngineRouter engineRouter,
            OpenAiSseTransformer transformer,
            SseEventBuilder sseBuilder,
            WebClient.Builder webClientBuilder,
            HealthChecker healthChecker,
            MeterRegistry meterRegistry,
            @Lazy ABTestService abTestService) {
        this.engineRouter = engineRouter;
        this.transformer = transformer;
        this.sseBuilder = sseBuilder;
        this.webClient = webClientBuilder.build();
        this.healthChecker = healthChecker;
        this.meterRegistry = meterRegistry;
        this.abTestService = abTestService;
    }

    public Flux<ServerSentEvent<String>> streamChat(GatewayRequest request) {
        String traceId = request.getTraceId();
        Instant startTime = Instant.now();

        // Handle A/B mode
        if ("ab".equalsIgnoreCase(request.getEngine())) {
            log.info("A/B mode requested: traceId={}", traceId);
            return abTestService.executeABTest(request);
        }

        try {
            String engine = engineRouter.selectEngine(request);
            String workerUrl = engineRouter.getWorkerUrl(engine);
            String modelName = engineRouter.getModelName(engine);

            log.info("Stream request: traceId={}, engine={}, model={}", traceId, engine, modelName);
            recordEngineSelection(engine);

            // Build worker request
            WorkerRequest workerRequest = buildWorkerRequest(request, modelName);

            // Meta event
            ServerSentEvent<String> metaEvent = sseBuilder.meta(MetaEvent.builder()
                    .traceId(traceId)
                    .engine(engine)
                    .model(modelName)
                    .mode("chat")
                    .timestamp(startTime)
                    .build());

            // Stream from worker
            Flux<ServerSentEvent<String>> workerStream = streamFromWorker(
                    workerUrl, workerRequest, traceId, engine, startTime
            );

            return Flux.concat(
                    Flux.just(metaEvent),
                    workerStream
            );

        } catch (EngineUnavailableException e) {
            log.error("No engine available: traceId={}", traceId);
            return Flux.just(sseBuilder.error(ErrorEvent.engineUnavailable(traceId)));
        } catch (Exception e) {
            log.error("Gateway error: traceId={}, error={}", traceId, e.getMessage());
            return Flux.just(sseBuilder.error("GATEWAY_ERROR", e.getMessage(), traceId));
        }
    }

    private Flux<ServerSentEvent<String>> streamFromWorker(
            String workerUrl,
            WorkerRequest request,
            String traceId,
            String engine,
            Instant startTime) {

        AtomicBoolean firstToken = new AtomicBoolean(false);

        return webClient.post()
                .uri(workerUrl + "/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class)
                .transform(transformer::transformOpenAiSse)
                .doOnNext(event -> {
                    if (!firstToken.getAndSet(true)) {
                        long ttft = Duration.between(startTime, Instant.now()).toMillis();
                        recordTTFT(engine, ttft);
                        healthChecker.markHealthy(engine);
                        log.debug("TTFT: traceId={}, engine={}, ttft={}ms", traceId, engine, ttft);
                    }
                })
                .doOnComplete(() -> {
                    long totalTime = Duration.between(startTime, Instant.now()).toMillis();
                    recordTotalTime(engine, totalTime);
                    log.info("Stream complete: traceId={}, engine={}, totalTime={}ms",
                            traceId, engine, totalTime);
                })
                .doOnError(e -> {
                    recordError(engine);
                    healthChecker.markUnhealthy(engine);
                    log.error("Stream error: traceId={}, engine={}, error={}",
                            traceId, engine, e.getMessage());
                })
                .timeout(Duration.ofSeconds(totalTimeoutSeconds))
                .onErrorResume(WebClientResponseException.class, e -> {
                    log.error("Worker error: traceId={}, status={}", traceId, e.getStatusCode());
                    return Flux.just(sseBuilder.error("WORKER_ERROR",
                            "Worker returned " + e.getStatusCode(), traceId));
                })
                .onErrorResume(e -> {
                    String errorMsg = e.getMessage();
                    if (errorMsg != null && errorMsg.contains("timeout")) {
                        return Flux.just(sseBuilder.error(ErrorEvent.timeout(traceId)));
                    }
                    return Flux.just(sseBuilder.error("STREAM_ERROR", errorMsg, traceId));
                });
    }

    private WorkerRequest buildWorkerRequest(GatewayRequest request, String model) {
        List<WorkerRequest.WorkerMessage> workerMessages = request.getMessages().stream()
                .map(msg -> WorkerRequest.WorkerMessage.builder()
                        .role(msg.getRole())
                        .content(msg.getContent())
                        .name(msg.getName())
                        .toolCallId(msg.getToolCallId())
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

        return builder.build();
    }

    // Metrics recording
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
}
