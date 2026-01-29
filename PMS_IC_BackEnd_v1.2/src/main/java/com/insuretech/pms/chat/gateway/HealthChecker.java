package com.insuretech.pms.chat.gateway;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Enhanced health monitoring for LLM worker endpoints with circuit breaker support
 */
@Slf4j
@Component
public class HealthChecker {

    private final WebClient webClient;
    private final Map<String, EngineHealth> healthCache = new ConcurrentHashMap<>();
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    @Value("${llm.workers.vllm.url:http://localhost:8000}")
    private String vllmUrl;

    @Value("${llm.workers.gguf.url:http://localhost:8080}")
    private String ggufUrl;

    @Value("${llm.workers.vllm.enabled:true}")
    private boolean vllmEnabled;

    @Value("${llm.workers.gguf.enabled:true}")
    private boolean ggufEnabled;

    public enum HealthStatus {
        HEALTHY, UNHEALTHY, DEGRADED, UNKNOWN
    }

    @Getter
    public static class EngineHealth {
        private volatile HealthStatus status = HealthStatus.UNKNOWN;
        private volatile Instant lastCheck;
        private volatile Instant lastSuccess;
        private volatile Instant lastFailure;
        private final AtomicInteger consecutiveFailures = new AtomicInteger(0);
        private final AtomicInteger totalRequests = new AtomicInteger(0);
        private final AtomicInteger failedRequests = new AtomicInteger(0);
        private final AtomicLong totalLatencyMs = new AtomicLong(0);
        private volatile String lastError;

        public void recordSuccess(long latencyMs) {
            status = HealthStatus.HEALTHY;
            lastSuccess = Instant.now();
            consecutiveFailures.set(0);
            totalRequests.incrementAndGet();
            totalLatencyMs.addAndGet(latencyMs);
        }

        public void recordFailure(String error) {
            int failures = consecutiveFailures.incrementAndGet();
            lastFailure = Instant.now();
            lastError = error;
            totalRequests.incrementAndGet();
            failedRequests.incrementAndGet();

            if (failures >= 3) {
                status = HealthStatus.UNHEALTHY;
            } else {
                status = HealthStatus.DEGRADED;
            }
        }

        public double getAverageLatencyMs() {
            int requests = totalRequests.get() - failedRequests.get();
            return requests > 0 ? (double) totalLatencyMs.get() / requests : 0;
        }

        public double getSuccessRate() {
            int total = totalRequests.get();
            return total > 0 ? (double) (total - failedRequests.get()) / total * 100 : 100;
        }
    }

    public HealthChecker(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();

        // Initialize circuit breaker registry with custom config
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
                .slidingWindowSize(10)
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .slowCallDurationThreshold(Duration.ofSeconds(10))
                .slowCallRateThreshold(50)
                .build();

        this.circuitBreakerRegistry = CircuitBreakerRegistry.of(config);

        // Initialize health cache
        healthCache.put("vllm", new EngineHealth());
        healthCache.put("gguf", new EngineHealth());
    }

    @Scheduled(fixedRateString = "${llm.health.check-interval:10000}")
    public void checkHealth() {
        if (vllmEnabled) {
            checkWorkerHealth("vllm", vllmUrl);
        }
        if (ggufEnabled) {
            checkWorkerHealth("gguf", ggufUrl);
        }
    }

    private void checkWorkerHealth(String engine, String url) {
        EngineHealth health = healthCache.get(engine);
        health.lastCheck = Instant.now();
        Instant startTime = Instant.now();

        webClient.get()
                .uri(url + "/health")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(5))
                .subscribe(
                        response -> {
                            long latency = Duration.between(startTime, Instant.now()).toMillis();
                            health.recordSuccess(latency);
                            getCircuitBreaker(engine).onSuccess(latency, TimeUnit.MILLISECONDS);
                            log.trace("Health check OK: {} ({}ms)", engine, latency);
                        },
                        error -> {
                            health.recordFailure(error.getMessage());
                            getCircuitBreaker(engine).onError(
                                    Duration.between(startTime, Instant.now()).toMillis(),
                                    TimeUnit.MILLISECONDS,
                                    error
                            );
                            log.debug("Health check FAILED: {} - {}", engine, error.getMessage());
                        }
                );
    }

    public boolean isHealthy(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health == null) {
            return false;
        }

        // Check circuit breaker state
        CircuitBreaker cb = getCircuitBreaker(engine);
        if (cb.getState() == CircuitBreaker.State.OPEN) {
            log.debug("Circuit breaker OPEN for engine: {}", engine);
            return false;
        }

        HealthStatus status = health.getStatus();
        // Treat UNKNOWN as healthy to allow first request
        return status == HealthStatus.HEALTHY || status == HealthStatus.UNKNOWN;
    }

    public boolean isAvailable(String engine) {
        boolean enabled = "vllm".equals(engine) ? vllmEnabled : ggufEnabled;
        return enabled && isHealthy(engine);
    }

    public Map<String, HealthStatus> getAllHealth() {
        Map<String, HealthStatus> result = new HashMap<>();
        healthCache.forEach((engine, health) -> result.put(engine, health.getStatus()));
        return result;
    }

    public Map<String, Object> getDetailedHealth(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health == null) {
            return Map.of("status", "UNKNOWN", "error", "Engine not found");
        }

        CircuitBreaker cb = getCircuitBreaker(engine);

        Map<String, Object> details = new HashMap<>();
        details.put("status", health.getStatus().name());
        details.put("lastCheck", health.getLastCheck());
        details.put("lastSuccess", health.getLastSuccess());
        details.put("lastFailure", health.getLastFailure());
        details.put("consecutiveFailures", health.getConsecutiveFailures().get());
        details.put("totalRequests", health.getTotalRequests().get());
        details.put("failedRequests", health.getFailedRequests().get());
        details.put("averageLatencyMs", health.getAverageLatencyMs());
        details.put("successRate", health.getSuccessRate());
        details.put("lastError", health.getLastError());
        details.put("circuitBreakerState", cb.getState().name());

        return details;
    }

    public void markHealthy(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.recordSuccess(0);
        }
    }

    public void markUnhealthy(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.recordFailure("Marked unhealthy by gateway");
        }
    }

    public CircuitBreaker getCircuitBreaker(String engine) {
        return circuitBreakerRegistry.circuitBreaker(engine + "-worker");
    }

    public void recordRequestLatency(String engine, long latencyMs) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.totalRequests.incrementAndGet();
            health.totalLatencyMs.addAndGet(latencyMs);
        }
    }
}
