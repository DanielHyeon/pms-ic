# Phase 2: Engine Integration

## GGUF Worker & Multi-Engine Routing

---

## Overview

| Attribute | Value |
|-----------|-------|
| Phase | 2 of 4 |
| Focus | GGUF Worker setup, engine routing, auto selection |
| Dependencies | Phase 1 (Foundation) completed |
| Deliverables | Both engines operational with seamless switching |

---

## Objectives

1. Configure GGUF Worker with OpenAI-compatible API
2. Connect GGUF Worker to LLM Gateway
3. Implement auto routing rules
4. Enable per-request engine switching
5. Validate both engines produce consistent output

---

## Task 2.1: GGUF Worker Configuration

### Description

Deploy llama.cpp server with OpenAI-compatible API endpoint for GGUF model inference.

### Deliverables

#### 2.1.1 Docker Configuration

```yaml
# docker-compose.yml
services:
  gguf-worker:
    image: ghcr.io/ggerganov/llama.cpp:server-cuda
    container_name: gguf-worker
    command: >
      --host 0.0.0.0
      --port 8080
      --model /models/${GGUF_MODEL_FILE:-gemma-3-12b-pt.Q5_K_M.gguf}
      --ctx-size ${GGUF_CTX_SIZE:-8192}
      --n-gpu-layers ${GGUF_GPU_LAYERS:-35}
      --threads ${GGUF_THREADS:-8}
      --parallel ${GGUF_PARALLEL:-2}
      --cont-batching
      --flash-attn
      --metrics
      --verbose
    volumes:
      - ./models:/models:ro
    ports:
      - "8081:8080"
    environment:
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        limits:
          memory: 16G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped
    networks:
      - llm-network
```

#### 2.1.2 Environment Configuration

```bash
# .env.gguf
GGUF_MODEL_FILE=gemma-3-12b-pt.Q5_K_M.gguf
GGUF_CTX_SIZE=8192
GGUF_GPU_LAYERS=35
GGUF_THREADS=8
GGUF_PARALLEL=2
```

#### 2.1.3 Model Download Script

```bash
#!/bin/bash
# scripts/download-gguf-model.sh

MODEL_DIR="./models"
MODEL_URL="https://huggingface.co/google/gemma-3-12b-pt-GGUF/resolve/main/gemma-3-12b-pt.Q5_K_M.gguf"
MODEL_FILE="gemma-3-12b-pt.Q5_K_M.gguf"

mkdir -p "$MODEL_DIR"

if [ ! -f "$MODEL_DIR/$MODEL_FILE" ]; then
    echo "Downloading GGUF model..."
    wget -O "$MODEL_DIR/$MODEL_FILE" "$MODEL_URL"
    echo "Download complete!"
else
    echo "Model already exists: $MODEL_DIR/$MODEL_FILE"
fi

# Verify file
echo "Model size: $(du -h "$MODEL_DIR/$MODEL_FILE" | cut -f1)"
```

#### 2.1.4 OpenAI Compatibility Verification

```bash
# Test OpenAI-compatible endpoint
curl -X POST http://localhost:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma-3-12b",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": true,
    "max_tokens": 100
  }'
```

Expected response format:
```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"gemma-3-12b","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"gemma-3-12b","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"gemma-3-12b","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"gemma-3-12b","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### Acceptance Criteria

- [ ] GGUF Worker container starts successfully
- [ ] Model loads without OOM errors
- [ ] `/v1/chat/completions` endpoint responds
- [ ] Streaming SSE format matches OpenAI spec
- [ ] Health endpoint returns healthy status
- [ ] GPU utilization visible during inference

---

## Task 2.2: Gateway GGUF Connection

### Description

Update LLM Gateway to route requests to GGUF Worker and handle any format differences.

### Deliverables

#### 2.2.1 Worker Configuration Update

```yaml
# llm-gateway/src/main/resources/application.yml
workers:
  vllm:
    url: ${VLLM_WORKER_URL:http://vllm-worker:8000}
    enabled: true
    timeout: 90s
    model: "Qwen2.5-7B-Instruct"
  gguf:
    url: ${GGUF_WORKER_URL:http://gguf-worker:8080}
    enabled: true
    timeout: 120s  # GGUF may be slower
    model: "gemma-3-12b"
  default: vllm
```

#### 2.2.2 Engine Router Enhancement

```java
// EngineRouter.java - Enhanced version
@Component
@Slf4j
public class EngineRouter {

    @Value("${workers.vllm.url}")
    private String vllmUrl;

    @Value("${workers.vllm.enabled:true}")
    private boolean vllmEnabled;

    @Value("${workers.gguf.url}")
    private String ggufUrl;

    @Value("${workers.gguf.enabled:true}")
    private boolean ggufEnabled;

    @Value("${workers.default:vllm}")
    private String defaultEngine;

    private final HealthChecker healthChecker;

    public EngineRouter(HealthChecker healthChecker) {
        this.healthChecker = healthChecker;
    }

    public String selectEngine(GatewayRequest request) {
        String requestedEngine = request.getEngine();

        // Explicit engine request
        if ("vllm".equals(requestedEngine)) {
            return validateEngineAvailable("vllm");
        }
        if ("gguf".equals(requestedEngine)) {
            return validateEngineAvailable("gguf");
        }

        // Auto selection
        if (requestedEngine == null || "auto".equals(requestedEngine)) {
            return selectAutoEngine(request);
        }

        // AB mode (Phase 3)
        if ("ab".equals(requestedEngine)) {
            return selectPrimaryForAB(request);
        }

        return defaultEngine;
    }

    private String selectAutoEngine(GatewayRequest request) {
        // Rule 1: Tools or JSON schema -> vLLM (better support)
        if (request.hasTools() || request.hasResponseFormat()) {
            log.debug("Auto: vLLM selected (tools/schema)");
            return validateEngineAvailable("vllm");
        }

        // Rule 2: Long context -> vLLM (better memory management)
        int contextLength = estimateContextLength(request);
        if (contextLength > 4096) {
            log.debug("Auto: vLLM selected (long context: {})", contextLength);
            return validateEngineAvailable("vllm");
        }

        // Rule 3: High concurrency period -> vLLM
        if (isHighConcurrencyPeriod()) {
            log.debug("Auto: vLLM selected (high concurrency)");
            return validateEngineAvailable("vllm");
        }

        // Rule 4: Simple queries -> GGUF (cost-effective)
        if (ggufEnabled && healthChecker.isHealthy("gguf")) {
            log.debug("Auto: GGUF selected (simple query)");
            return "gguf";
        }

        // Fallback
        return validateEngineAvailable(defaultEngine);
    }

    private String validateEngineAvailable(String engine) {
        boolean available = switch (engine) {
            case "vllm" -> vllmEnabled && healthChecker.isHealthy("vllm");
            case "gguf" -> ggufEnabled && healthChecker.isHealthy("gguf");
            default -> false;
        };

        if (!available) {
            log.warn("Engine {} not available, falling back", engine);
            // Try fallback
            String fallback = "vllm".equals(engine) ? "gguf" : "vllm";
            if (healthChecker.isHealthy(fallback)) {
                return fallback;
            }
            throw new EngineUnavailableException("No healthy engine available");
        }

        return engine;
    }

    private int estimateContextLength(GatewayRequest request) {
        return request.getMessages().stream()
            .mapToInt(m -> m.getContent() != null ? m.getContent().length() : 0)
            .sum();
    }

    private boolean isHighConcurrencyPeriod() {
        // Could integrate with metrics/monitoring
        // For now, simple time-based check
        int hour = LocalTime.now().getHour();
        return hour >= 9 && hour <= 18; // Business hours
    }

    private String selectPrimaryForAB(GatewayRequest request) {
        // For AB testing, default primary is vLLM
        return request.getAb() != null && request.getAb().getPrimary() != null
            ? request.getAb().getPrimary()
            : "vllm";
    }

    public String getWorkerUrl(String engine) {
        return switch (engine) {
            case "vllm" -> vllmUrl;
            case "gguf" -> ggufUrl;
            default -> throw new IllegalArgumentException("Unknown engine: " + engine);
        };
    }

    public String getModelName(String engine) {
        return switch (engine) {
            case "vllm" -> "Qwen2.5-7B-Instruct";
            case "gguf" -> "gemma-3-12b";
            default -> "unknown";
        };
    }
}
```

#### 2.2.3 Health Checker Service

```java
// HealthChecker.java
@Component
@Slf4j
public class HealthChecker {

    private final WebClient webClient;
    private final Map<String, HealthStatus> healthCache = new ConcurrentHashMap<>();

    @Value("${workers.vllm.url}")
    private String vllmUrl;

    @Value("${workers.gguf.url}")
    private String ggufUrl;

    public HealthChecker(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
            .codecs(config -> config.defaultCodecs().maxInMemorySize(1024))
            .build();
    }

    @Scheduled(fixedRate = 10000) // Every 10 seconds
    public void checkHealth() {
        checkWorkerHealth("vllm", vllmUrl);
        checkWorkerHealth("gguf", ggufUrl);
    }

    private void checkWorkerHealth(String engine, String url) {
        webClient.get()
            .uri(url + "/health")
            .retrieve()
            .bodyToMono(String.class)
            .timeout(Duration.ofSeconds(5))
            .subscribe(
                response -> {
                    healthCache.put(engine, HealthStatus.HEALTHY);
                    log.trace("Health check OK: {}", engine);
                },
                error -> {
                    healthCache.put(engine, HealthStatus.UNHEALTHY);
                    log.warn("Health check FAILED: {} - {}", engine, error.getMessage());
                }
            );
    }

    public boolean isHealthy(String engine) {
        HealthStatus status = healthCache.getOrDefault(engine, HealthStatus.UNKNOWN);
        return status == HealthStatus.HEALTHY;
    }

    public Map<String, HealthStatus> getAllHealth() {
        return new HashMap<>(healthCache);
    }

    public enum HealthStatus {
        HEALTHY, UNHEALTHY, UNKNOWN
    }
}
```

#### 2.2.4 Stream Handler Update for Multi-Engine

```java
// LlmStreamHandler.java - Multi-engine support
@Component
@RequiredArgsConstructor
@Slf4j
public class LlmStreamHandler {

    private final EngineRouter engineRouter;
    private final OpenAiSseTransformer transformer;
    private final WebClient webClient;
    private final MeterRegistry meterRegistry;

    public Flux<ServerSentEvent<String>> handleStream(GatewayRequest request) {
        String traceId = request.getTraceId();
        Instant startTime = Instant.now();

        try {
            String engine = engineRouter.selectEngine(request);
            String workerUrl = engineRouter.getWorkerUrl(engine);
            String modelName = engineRouter.getModelName(engine);

            log.info("Stream request: traceId={}, engine={}", traceId, engine);

            // Record metrics
            recordEngineSelection(engine);

            // Build worker request
            WorkerRequest workerRequest = buildWorkerRequest(request, modelName);

            // Meta event
            ServerSentEvent<String> metaEvent = buildMetaEvent(
                traceId, engine, modelName, startTime
            );

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
            return Flux.just(buildErrorEvent(traceId, "ENGINE_UNAVAILABLE", e.getMessage()));
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
                log.error("Stream error: traceId={}, engine={}", traceId, engine, e);
            })
            .timeout(Duration.ofSeconds(120))
            .onErrorResume(e -> Flux.just(
                buildErrorEvent(traceId, "STREAM_ERROR", e.getMessage())
            ));
    }

    private WorkerRequest buildWorkerRequest(GatewayRequest request, String model) {
        return WorkerRequest.builder()
            .model(model)
            .messages(request.getMessages())
            .stream(true)
            .temperature(request.getGeneration().getTemperature())
            .maxTokens(request.getGeneration().getMaxTokens())
            .topP(request.getGeneration().getTopP())
            .stop(request.getGeneration().getStop())
            .build();
    }

    private ServerSentEvent<String> buildMetaEvent(
            String traceId, String engine, String model, Instant timestamp) {
        String data = String.format(
            "{\"traceId\":\"%s\",\"engine\":\"%s\",\"model\":\"%s\",\"timestamp\":\"%s\"}",
            traceId, engine, model, timestamp
        );
        return ServerSentEvent.<String>builder()
            .event("meta")
            .data(data)
            .build();
    }

    private ServerSentEvent<String> buildErrorEvent(
            String traceId, String code, String message) {
        String data = String.format(
            "{\"traceId\":\"%s\",\"code\":\"%s\",\"message\":\"%s\"}",
            traceId, code, message
        );
        return ServerSentEvent.<String>builder()
            .event("error")
            .data(data)
            .build();
    }

    // Metrics recording
    private void recordEngineSelection(String engine) {
        meterRegistry.counter("llm.engine.selection", "engine", engine).increment();
    }

    private void recordTTFT(String engine, long ttftMs) {
        meterRegistry.timer("llm.ttft", "engine", engine)
            .record(ttftMs, TimeUnit.MILLISECONDS);
    }

    private void recordTotalTime(String engine, long totalMs) {
        meterRegistry.timer("llm.total.time", "engine", engine)
            .record(totalMs, TimeUnit.MILLISECONDS);
    }

    private void recordError(String engine) {
        meterRegistry.counter("llm.errors", "engine", engine).increment();
    }
}
```

### Acceptance Criteria

- [ ] Gateway routes to GGUF when `engine=gguf`
- [ ] Gateway routes to vLLM when `engine=vllm`
- [ ] Health checks run periodically
- [ ] Fallback works when one engine is down
- [ ] Metrics recorded for both engines
- [ ] Logging includes engine selection

---

## Task 2.3: Auto Routing Rules Implementation

### Description

Implement intelligent automatic engine selection based on request characteristics.

### Deliverables

#### 2.3.1 Auto Routing Configuration

```yaml
# application.yml
routing:
  auto:
    # Context length threshold for vLLM preference
    context-threshold: 4096

    # Enable time-based routing
    time-based-enabled: true
    business-hours-start: 9
    business-hours-end: 18

    # Concurrency-based routing
    gguf-max-concurrent: 2
    vllm-max-concurrent: 10

    # Feature-based rules
    tools-prefer-vllm: true
    json-schema-prefer-vllm: true

    # Default fallback
    default-engine: vllm
```

#### 2.3.2 Routing Rules Service

```java
// RoutingRulesService.java
@Service
@Slf4j
public class RoutingRulesService {

    private final RoutingConfig config;
    private final ConcurrencyTracker concurrencyTracker;

    public RoutingRulesService(RoutingConfig config, ConcurrencyTracker tracker) {
        this.config = config;
        this.concurrencyTracker = tracker;
    }

    public RoutingDecision evaluate(GatewayRequest request) {
        List<RoutingRule> rules = List.of(
            new ToolsRule(),
            new JsonSchemaRule(),
            new ContextLengthRule(),
            new ConcurrencyRule(),
            new TimeBasedRule()
        );

        for (RoutingRule rule : rules) {
            Optional<String> decision = rule.evaluate(request, config);
            if (decision.isPresent()) {
                return new RoutingDecision(decision.get(), rule.getName());
            }
        }

        return new RoutingDecision(config.getDefaultEngine(), "default");
    }

    // Rule implementations
    private class ToolsRule implements RoutingRule {
        @Override
        public String getName() { return "tools"; }

        @Override
        public Optional<String> evaluate(GatewayRequest req, RoutingConfig cfg) {
            if (cfg.isToolsPreferVllm() && req.hasTools()) {
                log.debug("Rule [tools]: Request has tools, selecting vLLM");
                return Optional.of("vllm");
            }
            return Optional.empty();
        }
    }

    private class JsonSchemaRule implements RoutingRule {
        @Override
        public String getName() { return "json_schema"; }

        @Override
        public Optional<String> evaluate(GatewayRequest req, RoutingConfig cfg) {
            if (cfg.isJsonSchemaPreferVllm() && req.hasResponseFormat()) {
                log.debug("Rule [json_schema]: Request has response_format, selecting vLLM");
                return Optional.of("vllm");
            }
            return Optional.empty();
        }
    }

    private class ContextLengthRule implements RoutingRule {
        @Override
        public String getName() { return "context_length"; }

        @Override
        public Optional<String> evaluate(GatewayRequest req, RoutingConfig cfg) {
            int length = estimateContextLength(req);
            if (length > cfg.getContextThreshold()) {
                log.debug("Rule [context_length]: {} > {}, selecting vLLM",
                    length, cfg.getContextThreshold());
                return Optional.of("vllm");
            }
            return Optional.empty();
        }

        private int estimateContextLength(GatewayRequest req) {
            return req.getMessages().stream()
                .mapToInt(m -> m.getContent() != null ? m.getContent().length() : 0)
                .sum();
        }
    }

    private class ConcurrencyRule implements RoutingRule {
        @Override
        public String getName() { return "concurrency"; }

        @Override
        public Optional<String> evaluate(GatewayRequest req, RoutingConfig cfg) {
            int ggufConcurrent = concurrencyTracker.getCurrent("gguf");
            int vllmConcurrent = concurrencyTracker.getCurrent("vllm");

            // If GGUF is at capacity, use vLLM
            if (ggufConcurrent >= cfg.getGgufMaxConcurrent()) {
                log.debug("Rule [concurrency]: GGUF at capacity ({}), selecting vLLM",
                    ggufConcurrent);
                return Optional.of("vllm");
            }

            // If both have capacity, prefer GGUF for simple queries
            return Optional.empty();
        }
    }

    private class TimeBasedRule implements RoutingRule {
        @Override
        public String getName() { return "time_based"; }

        @Override
        public Optional<String> evaluate(GatewayRequest req, RoutingConfig cfg) {
            if (!cfg.isTimeBasedEnabled()) {
                return Optional.empty();
            }

            int hour = LocalTime.now().getHour();
            boolean isBusinessHours =
                hour >= cfg.getBusinessHoursStart() &&
                hour < cfg.getBusinessHoursEnd();

            // During business hours, prefer vLLM for better throughput
            if (isBusinessHours) {
                log.debug("Rule [time_based]: Business hours, preferring vLLM");
                // Don't force vLLM, just influence the decision
                // Let other rules or default handle it
            }

            return Optional.empty();
        }
    }
}

interface RoutingRule {
    String getName();
    Optional<String> evaluate(GatewayRequest request, RoutingConfig config);
}

@Data
@AllArgsConstructor
class RoutingDecision {
    private String engine;
    private String reason;
}
```

#### 2.3.3 Concurrency Tracker

```java
// ConcurrencyTracker.java
@Component
@Slf4j
public class ConcurrencyTracker {

    private final Map<String, AtomicInteger> concurrentRequests = new ConcurrentHashMap<>();

    public ConcurrencyTracker() {
        concurrentRequests.put("vllm", new AtomicInteger(0));
        concurrentRequests.put("gguf", new AtomicInteger(0));
    }

    public int getCurrent(String engine) {
        return concurrentRequests.getOrDefault(engine, new AtomicInteger(0)).get();
    }

    public void increment(String engine) {
        concurrentRequests.computeIfAbsent(engine, k -> new AtomicInteger(0))
            .incrementAndGet();
        log.trace("Concurrency increment: {} = {}", engine, getCurrent(engine));
    }

    public void decrement(String engine) {
        AtomicInteger counter = concurrentRequests.get(engine);
        if (counter != null && counter.get() > 0) {
            counter.decrementAndGet();
        }
        log.trace("Concurrency decrement: {} = {}", engine, getCurrent(engine));
    }

    // For monitoring
    public Map<String, Integer> getAllConcurrency() {
        return concurrentRequests.entrySet().stream()
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> e.getValue().get()
            ));
    }
}
```

### Acceptance Criteria

- [ ] Tools/schema requests route to vLLM
- [ ] Long context requests route to vLLM
- [ ] Concurrency limits enforced for GGUF
- [ ] Routing decision logged with reason
- [ ] Configuration is externalized

---

## Task 2.4: Engine Switching Validation

### Description

Verify that switching between engines produces consistent, correct output.

### Deliverables

#### 2.4.1 Comparison Test Suite

```java
// EngineComparisonTest.java
@SpringBootTest
@Testcontainers
class EngineComparisonTest {

    @Autowired
    private LlmStreamHandler streamHandler;

    @Test
    void bothEnginesProduceValidOutput() {
        String testMessage = "Explain what a project charter is in one sentence.";

        // Test vLLM
        GatewayRequest vllmRequest = buildRequest(testMessage, "vllm");
        String vllmOutput = collectStreamOutput(streamHandler.handleStream(vllmRequest));

        // Test GGUF
        GatewayRequest ggufRequest = buildRequest(testMessage, "gguf");
        String ggufOutput = collectStreamOutput(streamHandler.handleStream(ggufRequest));

        // Both should produce non-empty, reasonable responses
        assertThat(vllmOutput).isNotBlank();
        assertThat(ggufOutput).isNotBlank();
        assertThat(vllmOutput.length()).isGreaterThan(20);
        assertThat(ggufOutput.length()).isGreaterThan(20);

        // Log for manual comparison
        log.info("vLLM output: {}", vllmOutput);
        log.info("GGUF output: {}", ggufOutput);
    }

    @Test
    void sseFormatConsistentAcrossEngines() {
        String testMessage = "Say hello";

        for (String engine : List.of("vllm", "gguf")) {
            GatewayRequest request = buildRequest(testMessage, engine);
            List<ServerSentEvent<String>> events =
                streamHandler.handleStream(request).collectList().block();

            // Verify event structure
            assertThat(events).isNotEmpty();

            // First event should be meta
            assertThat(events.get(0).event()).isEqualTo("meta");

            // Should have delta events
            boolean hasDelta = events.stream()
                .anyMatch(e -> "delta".equals(e.event()));
            assertThat(hasDelta).isTrue();

            // Last non-meta event should be done or error
            String lastEvent = events.get(events.size() - 1).event();
            assertThat(lastEvent).isIn("done", "error");
        }
    }

    @Test
    void autoRoutingSelectsAppropriateEngine() {
        // Simple query -> may select GGUF
        GatewayRequest simpleRequest = GatewayRequest.builder()
            .traceId(UUID.randomUUID().toString())
            .engine("auto")
            .messages(List.of(ChatMessage.builder()
                .role("user")
                .content("Hi")
                .build()))
            .build();

        // Query with tools -> should select vLLM
        GatewayRequest toolsRequest = GatewayRequest.builder()
            .traceId(UUID.randomUUID().toString())
            .engine("auto")
            .messages(List.of(ChatMessage.builder()
                .role("user")
                .content("Get project status")
                .build()))
            .tools(List.of(ToolDefinition.builder()
                .name("getProjectStatus")
                .build()))
            .build();

        // Execute and check meta events for engine selection
        String simpleEngine = extractEngineFromMeta(
            streamHandler.handleStream(simpleRequest)
        );
        String toolsEngine = extractEngineFromMeta(
            streamHandler.handleStream(toolsRequest)
        );

        // Tools request must use vLLM
        assertThat(toolsEngine).isEqualTo("vllm");
        // Simple request can use either (just verify it works)
        assertThat(simpleEngine).isIn("vllm", "gguf");
    }

    private String collectStreamOutput(Flux<ServerSentEvent<String>> stream) {
        StringBuilder sb = new StringBuilder();
        stream.toIterable().forEach(event -> {
            if ("delta".equals(event.event())) {
                try {
                    JsonNode data = objectMapper.readTree(event.data());
                    if ("text".equals(data.path("kind").asText())) {
                        sb.append(data.path("text").asText());
                    }
                } catch (Exception ignored) {}
            }
        });
        return sb.toString();
    }
}
```

#### 2.4.2 Manual Validation Script

```bash
#!/bin/bash
# scripts/validate-engines.sh

API_URL="http://localhost:8084"
MESSAGE="Explain the difference between a milestone and a deliverable."

echo "=== Testing vLLM ==="
curl -N -X POST "$API_URL/llm/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{
    \"traceId\": \"test-vllm-$(date +%s)\",
    \"engine\": \"vllm\",
    \"stream\": true,
    \"messages\": [{\"role\": \"user\", \"content\": \"$MESSAGE\"}],
    \"generation\": {\"maxTokens\": 200}
  }" 2>/dev/null | head -20

echo -e "\n\n=== Testing GGUF ==="
curl -N -X POST "$API_URL/llm/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{
    \"traceId\": \"test-gguf-$(date +%s)\",
    \"engine\": \"gguf\",
    \"stream\": true,
    \"messages\": [{\"role\": \"user\", \"content\": \"$MESSAGE\"}],
    \"generation\": {\"maxTokens\": 200}
  }" 2>/dev/null | head -20

echo -e "\n\n=== Testing Auto ==="
curl -N -X POST "$API_URL/llm/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{
    \"traceId\": \"test-auto-$(date +%s)\",
    \"engine\": \"auto\",
    \"stream\": true,
    \"messages\": [{\"role\": \"user\", \"content\": \"$MESSAGE\"}],
    \"generation\": {\"maxTokens\": 200}
  }" 2>/dev/null | head -20
```

### Acceptance Criteria

- [ ] Both engines produce valid responses
- [ ] SSE format identical between engines
- [ ] Auto routing logic works correctly
- [ ] No errors when switching engines
- [ ] Performance metrics comparable

---

## Task 2.5: UI Engine Selector Enhancement

### Description

Update React frontend to allow developers to easily switch engines during testing.

### Deliverables

#### 2.5.1 Engine Selector Component

```typescript
// components/EngineSelector.tsx
import React from 'react';

interface EngineSelectorProps {
  value: string;
  onChange: (engine: string) => void;
  disabled?: boolean;
  showMetrics?: boolean;
  currentEngine?: string;
}

export function EngineSelector({
  value,
  onChange,
  disabled,
  showMetrics,
  currentEngine
}: EngineSelectorProps) {
  const engines = [
    { value: 'auto', label: 'Auto', description: 'Automatic selection based on query' },
    { value: 'vllm', label: 'vLLM', description: 'High throughput, tool calling' },
    { value: 'gguf', label: 'GGUF', description: 'Cost-effective, local inference' },
  ];

  return (
    <div className="engine-selector">
      <label htmlFor="engine">Engine:</label>
      <select
        id="engine"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {engines.map((engine) => (
          <option key={engine.value} value={engine.value}>
            {engine.label}
          </option>
        ))}
      </select>

      {showMetrics && currentEngine && (
        <span className="current-engine">
          Active: {currentEngine}
        </span>
      )}

      <div className="engine-description">
        {engines.find(e => e.value === value)?.description}
      </div>
    </div>
  );
}
```

#### 2.5.2 Dev Panel with Engine Info

```typescript
// components/DevPanel.tsx
import React, { useState, useEffect } from 'react';

interface EngineHealth {
  vllm: 'healthy' | 'unhealthy' | 'unknown';
  gguf: 'healthy' | 'unhealthy' | 'unknown';
}

interface StreamMeta {
  traceId: string;
  engine: string;
  model: string;
  timestamp: string;
}

interface DevPanelProps {
  meta: StreamMeta | null;
  isStreaming: boolean;
}

export function DevPanel({ meta, isStreaming }: DevPanelProps) {
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Fetch health status periodically
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/v2/chat/health/engines');
        const data = await res.json();
        setHealth(data);
      } catch {
        // Ignore errors
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!expanded) {
    return (
      <button
        className="dev-panel-toggle"
        onClick={() => setExpanded(true)}
      >
        Dev Info
      </button>
    );
  }

  return (
    <div className="dev-panel">
      <button onClick={() => setExpanded(false)}>Close</button>

      <h4>Engine Health</h4>
      {health && (
        <div className="health-status">
          <span className={`status ${health.vllm}`}>
            vLLM: {health.vllm}
          </span>
          <span className={`status ${health.gguf}`}>
            GGUF: {health.gguf}
          </span>
        </div>
      )}

      <h4>Current Stream</h4>
      {meta ? (
        <div className="stream-info">
          <div>Trace ID: <code>{meta.traceId}</code></div>
          <div>Engine: <strong>{meta.engine}</strong></div>
          <div>Model: {meta.model}</div>
          <div>Started: {meta.timestamp}</div>
        </div>
      ) : (
        <div className="no-stream">No active stream</div>
      )}

      {isStreaming && (
        <div className="streaming-indicator">
          Streaming...
        </div>
      )}
    </div>
  );
}
```

### Acceptance Criteria

- [ ] Engine selector dropdown works
- [ ] Selected engine persists across messages
- [ ] Dev panel shows active engine
- [ ] Health status displayed for both engines
- [ ] Easy to switch for testing

---

## Testing Strategy

### Integration Tests

| Test | Description |
|------|-------------|
| GGUF Worker health | Worker responds to health check |
| GGUF streaming | Complete stream from GGUF worker |
| Engine switching | Switch between engines mid-session |
| Fallback behavior | Route to vLLM when GGUF is down |

### Performance Tests

| Metric | Target |
|--------|--------|
| GGUF TTFT | < 3 seconds |
| vLLM TTFT | < 2 seconds |
| GGUF throughput | 20 tokens/sec |
| vLLM throughput | 50 tokens/sec |

### Manual Testing Checklist

- [ ] Send message with `engine=gguf` - receives GGUF response
- [ ] Send message with `engine=vllm` - receives vLLM response
- [ ] Send message with `engine=auto` - appropriate engine selected
- [ ] Kill GGUF container - fallback to vLLM works
- [ ] Kill vLLM container - fallback to GGUF works
- [ ] Kill both containers - proper error returned

---

## Definition of Done

### Code Complete

- [ ] GGUF Worker configured and running
- [ ] Gateway routes to both engines
- [ ] Auto routing rules implemented
- [ ] Health checks operational
- [ ] Metrics recording for both engines

### Testing

- [ ] Integration tests passing
- [ ] Performance benchmarks recorded
- [ ] Manual validation completed

### Documentation

- [ ] GGUF setup guide
- [ ] Routing rules documented
- [ ] Troubleshooting guide

### Deployment

- [ ] Docker compose includes GGUF worker
- [ ] Environment variables documented
- [ ] Health endpoints accessible

---

## Dependencies & Risks

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Phase 1 complete | Required | Foundation must be in place |
| GGUF model file | Required | Must be downloaded |
| GPU availability | Recommended | For acceptable GGUF performance |

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| GGUF performance issues | High | Tune GPU layers, reduce context |
| Model incompatibility | Medium | Test model before deployment |
| Memory pressure | High | Monitor and set limits |

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| 2.1 GGUF Worker Configuration | 2 days |
| 2.2 Gateway GGUF Connection | 2 days |
| 2.3 Auto Routing Rules | 2 days |
| 2.4 Engine Switching Validation | 1 day |
| 2.5 UI Enhancement | 1 day |
| Testing & Integration | 2 days |
| **Total** | **10 days** |

---

*Phase 2 Document Version: 1.0*
*Last Updated: 2026-01-29*
