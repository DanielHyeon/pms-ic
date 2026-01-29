package com.insuretech.pms.chat.gateway;

import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

/**
 * Routes requests to appropriate LLM engine based on request characteristics
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EngineRouter {

    private final HealthChecker healthChecker;

    @Value("${llm.workers.vllm.url:http://localhost:8000}")
    private String vllmUrl;

    @Value("${llm.workers.vllm.enabled:true}")
    private boolean vllmEnabled;

    @Value("${llm.workers.gguf.url:http://localhost:8080}")
    private String ggufUrl;

    @Value("${llm.workers.gguf.enabled:true}")
    private boolean ggufEnabled;

    @Value("${llm.workers.default:gguf}")
    private String defaultEngine;

    @Value("${llm.routing.context-threshold:4096}")
    private int contextThreshold;

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
        int contextLength = request.estimateContextLength();
        if (contextLength > contextThreshold) {
            log.debug("Auto: vLLM selected (long context: {})", contextLength);
            return validateEngineAvailable("vllm");
        }

        // Rule 3: Business hours -> prefer vLLM for throughput
        if (isBusinessHours()) {
            log.debug("Auto: vLLM preferred (business hours)");
            if (vllmEnabled && healthChecker.isHealthy("vllm")) {
                return "vllm";
            }
        }

        // Rule 4: Simple queries -> GGUF (cost-effective, local)
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
            log.warn("Engine {} not available, attempting fallback", engine);
            String fallback = "vllm".equals(engine) ? "gguf" : "vllm";
            if (healthChecker.isHealthy(fallback)) {
                log.info("Fallback to {} engine", fallback);
                return fallback;
            }
            throw new EngineUnavailableException("No healthy engine available");
        }

        return engine;
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

    public String getWorkerUrl(String engine) {
        return switch (engine) {
            case "vllm" -> vllmUrl;
            case "gguf" -> ggufUrl;
            default -> throw new IllegalArgumentException("Unknown engine: " + engine);
        };
    }

    public String getModelName(String engine) {
        return switch (engine) {
            case "vllm" -> "qwen3-8b";
            case "gguf" -> "gemma-3-12b";
            default -> "unknown";
        };
    }

    public boolean isEngineEnabled(String engine) {
        return switch (engine) {
            case "vllm" -> vllmEnabled;
            case "gguf" -> ggufEnabled;
            default -> false;
        };
    }
}
