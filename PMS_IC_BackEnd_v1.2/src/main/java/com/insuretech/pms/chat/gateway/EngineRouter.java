package com.insuretech.pms.chat.gateway;

import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Routes requests to appropriate LLM engine based on request characteristics.
 *
 * <p>Routing Strategy:</p>
 * <ul>
 *   <li>Explicit engine requests are honored if the engine is available</li>
 *   <li>Auto mode selects based on request complexity, tools, and context length</li>
 *   <li>Fallback routing when primary engine is unavailable</li>
 *   <li>Circuit breaker state is considered for availability</li>
 * </ul>
 */
@Slf4j
@Component
public class EngineRouter {

    private final HealthChecker healthChecker;
    private final VllmConfigService vllmConfigService;
    private final GgufConfigService ggufConfigService;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    // Engine priority order for auto selection
    private static final List<String> ENGINE_PRIORITY = List.of("vllm", "gguf");

    // Track recent fallback events to avoid flapping
    private final Map<String, Long> recentFallbacks = new ConcurrentHashMap<>();
    private static final long FALLBACK_COOLDOWN_MS = 30_000; // 30 seconds

    @Value("${llm.workers.vllm.tool-calling:true}")
    private boolean vllmToolCalling;

    @Value("${llm.workers.vllm.json-schema:true}")
    private boolean vllmJsonSchema;

    @Value("${llm.workers.default:auto}")
    private String defaultEngine;

    @Value("${llm.routing.context-threshold:4096}")
    private int contextThreshold;

    @Value("${llm.routing.tools-prefer-vllm:true}")
    private boolean toolsPreferVllm;

    @Value("${llm.routing.fallback.enabled:true}")
    private boolean fallbackEnabled;

    public EngineRouter(
            HealthChecker healthChecker,
            VllmConfigService vllmConfigService,
            GgufConfigService ggufConfigService,
            CircuitBreakerRegistry circuitBreakerRegistry) {
        this.healthChecker = healthChecker;
        this.vllmConfigService = vllmConfigService;
        this.ggufConfigService = ggufConfigService;
        this.circuitBreakerRegistry = circuitBreakerRegistry;
    }

    /**
     * Select the best available engine for the request.
     *
     * @param request the gateway request
     * @return the selected engine name
     * @throws EngineUnavailableException if no engine is available
     */
    public String selectEngine(GatewayRequest request) {
        String requestedEngine = request.getEngine();

        // Explicit engine request
        if ("vllm".equals(requestedEngine)) {
            return validateEngineAvailable("vllm", request);
        }
        if ("gguf".equals(requestedEngine)) {
            return validateEngineAvailable("gguf", request);
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

    /**
     * Auto-select engine based on request characteristics and system state.
     */
    private String selectAutoEngine(GatewayRequest request) {
        // Rule 1: Tools or JSON schema -> vLLM (better support)
        if (toolsPreferVllm && (request.hasTools() || request.hasResponseFormat())) {
            if (isEngineFullyAvailable("vllm")) {
                log.debug("Auto: vLLM selected (tools/schema, prefer_vllm={})", toolsPreferVllm);
                return "vllm";
            }
            // Fallback to GGUF if vLLM unavailable but GGUF supports required features
            if (request.hasTools() && ggufConfigService.supportsToolCalling() && isEngineFullyAvailable("gguf")) {
                log.debug("Auto: GGUF selected as fallback for tools (vLLM unavailable)");
                return "gguf";
            }
        }

        // Rule 2: Long context -> vLLM (better memory management)
        int contextLength = request.estimateContextLength();
        if (contextLength > contextThreshold) {
            if (isEngineFullyAvailable("vllm")) {
                log.debug("Auto: vLLM selected (long context: {})", contextLength);
                return "vllm";
            }
        }

        // Rule 3: Business hours -> prefer vLLM for throughput
        if (isBusinessHours()) {
            if (isEngineFullyAvailable("vllm")) {
                log.debug("Auto: vLLM preferred (business hours)");
                return "vllm";
            }
        }

        // Rule 4: Simple queries -> GGUF (cost-effective, local)
        if (isEngineFullyAvailable("gguf")) {
            log.debug("Auto: GGUF selected (simple query)");
            return "gguf";
        }

        // Rule 5: Fallback to any available engine
        return selectAnyAvailableEngine();
    }

    /**
     * Validate that requested engine is available, with fallback support.
     */
    private String validateEngineAvailable(String engine, GatewayRequest request) {
        if (isEngineFullyAvailable(engine)) {
            return engine;
        }

        log.warn("Requested engine {} not available", engine);

        if (!fallbackEnabled) {
            throw new EngineUnavailableException("Requested engine " + engine + " is not available");
        }

        // Try fallback
        String fallback = selectFallbackEngine(engine, request);
        if (fallback != null) {
            recordFallback(engine, fallback);
            log.info("Fallback from {} to {} engine", engine, fallback);
            return fallback;
        }

        throw new EngineUnavailableException("No healthy engine available (requested: " + engine + ")");
    }

    /**
     * Select a fallback engine when primary is unavailable.
     */
    private String selectFallbackEngine(String failedEngine, GatewayRequest request) {
        // Check if we're in cooldown from recent fallback
        Long lastFallback = recentFallbacks.get(failedEngine);
        if (lastFallback != null && System.currentTimeMillis() - lastFallback < FALLBACK_COOLDOWN_MS) {
            log.debug("Fallback from {} still in cooldown period", failedEngine);
        }

        // Try alternate engine
        String alternate = "vllm".equals(failedEngine) ? "gguf" : "vllm";

        // Check if alternate can handle the request requirements
        if (request.hasTools() && !supportsToolCalling(alternate)) {
            log.debug("Alternate engine {} does not support required tool calling", alternate);
            return null;
        }

        if (request.hasResponseFormat() && !supportsJsonSchema(alternate)) {
            log.debug("Alternate engine {} does not support required JSON schema", alternate);
            return null;
        }

        if (isEngineFullyAvailable(alternate)) {
            return alternate;
        }

        return null;
    }

    /**
     * Select any available engine based on priority.
     */
    private String selectAnyAvailableEngine() {
        for (String engine : ENGINE_PRIORITY) {
            if (isEngineFullyAvailable(engine)) {
                log.debug("Selected first available engine: {}", engine);
                return engine;
            }
        }
        throw new EngineUnavailableException("No healthy engine available");
    }

    /**
     * Check if engine is fully available (enabled, healthy, circuit closed/half-open).
     */
    public boolean isEngineFullyAvailable(String engine) {
        // Check if engine is enabled
        if (!isEngineEnabled(engine)) {
            return false;
        }

        // Check health status
        if (!healthChecker.isHealthy(engine)) {
            return false;
        }

        // Check circuit breaker state
        CircuitBreaker cb = getCircuitBreaker(engine);
        CircuitBreaker.State state = cb.getState();

        // Allow CLOSED and HALF_OPEN states
        return state == CircuitBreaker.State.CLOSED || state == CircuitBreaker.State.HALF_OPEN;
    }

    /**
     * Get circuit breaker state information for an engine.
     */
    public Map<String, Object> getCircuitBreakerInfo(String engine) {
        CircuitBreaker cb = getCircuitBreaker(engine);
        CircuitBreaker.Metrics metrics = cb.getMetrics();

        return Map.of(
                "state", cb.getState().name(),
                "failureRate", metrics.getFailureRate(),
                "slowCallRate", metrics.getSlowCallRate(),
                "numberOfSuccessfulCalls", metrics.getNumberOfSuccessfulCalls(),
                "numberOfFailedCalls", metrics.getNumberOfFailedCalls(),
                "numberOfSlowCalls", metrics.getNumberOfSlowCalls(),
                "notPermittedCalls", metrics.getNumberOfNotPermittedCalls()
        );
    }

    private CircuitBreaker getCircuitBreaker(String engine) {
        return circuitBreakerRegistry.circuitBreaker(engine + "-gateway");
    }

    private boolean isBusinessHours() {
        int hour = LocalTime.now().getHour();
        return hour >= 9 && hour < 18;
    }

    private String selectPrimaryForAB(GatewayRequest request) {
        if (request.getAb() != null && request.getAb().getPrimary() != null) {
            return request.getAb().getPrimary();
        }
        return "vllm";
    }

    private void recordFallback(String from, String to) {
        recentFallbacks.put(from, System.currentTimeMillis());
        log.info("Recorded fallback from {} to {} at {}", from, to, System.currentTimeMillis());
    }

    public String getWorkerUrl(String engine) {
        return switch (engine) {
            case "vllm" -> vllmConfigService.getCurrentUrl();
            case "gguf" -> ggufConfigService.getCurrentUrl();
            default -> throw new IllegalArgumentException("Unknown engine: " + engine);
        };
    }

    public String getModelName(String engine) {
        return switch (engine) {
            case "vllm" -> vllmConfigService.getCurrentModel();
            case "gguf" -> ggufConfigService.getCurrentModel();
            default -> "unknown";
        };
    }

    public boolean isEngineEnabled(String engine) {
        return switch (engine) {
            case "vllm" -> vllmConfigService.isEnabled();
            case "gguf" -> ggufConfigService.isEnabled();
            default -> false;
        };
    }

    public boolean supportsToolCalling(String engine) {
        return switch (engine) {
            case "vllm" -> vllmToolCalling;
            case "gguf" -> ggufConfigService.supportsToolCalling();
            default -> false;
        };
    }

    public boolean supportsJsonSchema(String engine) {
        return switch (engine) {
            case "vllm" -> vllmJsonSchema;
            case "gguf" -> ggufConfigService.supportsJsonSchema();
            default -> false;
        };
    }

    /**
     * Get status summary of all engines.
     */
    public Map<String, Map<String, Object>> getAllEngineStatus() {
        return Map.of(
                "vllm", getEngineStatus("vllm"),
                "gguf", getEngineStatus("gguf")
        );
    }

    /**
     * Get detailed status for a specific engine.
     */
    public Map<String, Object> getEngineStatus(String engine) {
        return Map.of(
                "enabled", isEngineEnabled(engine),
                "healthy", healthChecker.isHealthy(engine),
                "fullyAvailable", isEngineFullyAvailable(engine),
                "circuitBreaker", getCircuitBreakerInfo(engine),
                "supportsTools", supportsToolCalling(engine),
                "supportsJsonSchema", supportsJsonSchema(engine),
                "url", getWorkerUrl(engine),
                "model", getModelName(engine)
        );
    }
}
