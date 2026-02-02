package com.insuretech.pms.chat.gateway;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Enhanced health monitoring for LLM worker endpoints with circuit breaker support.
 *
 * <p>Features:</p>
 * <ul>
 *   <li>Periodic health checks with configurable intervals</li>
 *   <li>Circuit breaker integration for failure tracking</li>
 *   <li>Detailed health metrics (latency, success rate, etc.)</li>
 *   <li>Degraded state detection for early warning</li>
 *   <li>Micrometer metrics export for monitoring</li>
 * </ul>
 */
@Slf4j
@Component
public class HealthChecker {

    private final WebClient webClient;
    private final Map<String, EngineHealth> healthCache = new ConcurrentHashMap<>();
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final MeterRegistry meterRegistry;

    @Value("${llm.workers.vllm.url:http://localhost:8000}")
    private String vllmUrl;

    @Value("${llm.workers.gguf.url:http://localhost:8080}")
    private String ggufUrl;

    @Value("${llm.workers.vllm.enabled:true}")
    private boolean vllmEnabled;

    @Value("${llm.workers.gguf.enabled:true}")
    private boolean ggufEnabled;

    @Value("${llm.health.check-timeout:5}")
    private int healthCheckTimeoutSeconds;

    @Value("${llm.health.consecutive-failures-threshold:3}")
    private int consecutiveFailuresThreshold;

    @Value("${llm.health.degraded-latency-threshold:5000}")
    private long degradedLatencyThresholdMs;

    public enum HealthStatus {
        HEALTHY,      // Normal operation
        DEGRADED,     // Elevated latency or partial failures
        UNHEALTHY,    // Multiple consecutive failures
        UNKNOWN       // Initial state or no data
    }

    @Getter
    public static class EngineHealth {
        private volatile HealthStatus status = HealthStatus.UNKNOWN;
        private volatile Instant lastCheck;
        private volatile Instant lastSuccess;
        private volatile Instant lastFailure;
        private final AtomicInteger consecutiveFailures = new AtomicInteger(0);
        private final AtomicInteger consecutiveSuccesses = new AtomicInteger(0);
        private final AtomicInteger totalRequests = new AtomicInteger(0);
        private final AtomicInteger failedRequests = new AtomicInteger(0);
        private final AtomicLong totalLatencyMs = new AtomicLong(0);
        private final AtomicLong lastLatencyMs = new AtomicLong(0);
        private volatile String lastError;

        public void recordSuccess(long latencyMs, long degradedThreshold) {
            lastSuccess = Instant.now();
            lastLatencyMs.set(latencyMs);
            consecutiveFailures.set(0);
            consecutiveSuccesses.incrementAndGet();
            totalRequests.incrementAndGet();
            totalLatencyMs.addAndGet(latencyMs);
            lastError = null;

            // Check for degraded state (high latency)
            if (latencyMs > degradedThreshold) {
                status = HealthStatus.DEGRADED;
            } else {
                status = HealthStatus.HEALTHY;
            }
        }

        public void recordFailure(String error, int threshold) {
            int failures = consecutiveFailures.incrementAndGet();
            consecutiveSuccesses.set(0);
            lastFailure = Instant.now();
            lastError = error;
            totalRequests.incrementAndGet();
            failedRequests.incrementAndGet();

            if (failures >= threshold) {
                status = HealthStatus.UNHEALTHY;
            } else {
                status = HealthStatus.DEGRADED;
            }
        }

        public double getAverageLatencyMs() {
            int successfulRequests = totalRequests.get() - failedRequests.get();
            return successfulRequests > 0 ? (double) totalLatencyMs.get() / successfulRequests : 0;
        }

        public double getSuccessRate() {
            int total = totalRequests.get();
            return total > 0 ? (double) (total - failedRequests.get()) / total * 100 : 100;
        }

        public void reset() {
            status = HealthStatus.UNKNOWN;
            consecutiveFailures.set(0);
            consecutiveSuccesses.set(0);
            totalRequests.set(0);
            failedRequests.set(0);
            totalLatencyMs.set(0);
            lastLatencyMs.set(0);
            lastError = null;
        }
    }

    public HealthChecker(
            WebClient.Builder webClientBuilder,
            CircuitBreakerRegistry circuitBreakerRegistry,
            MeterRegistry meterRegistry) {
        this.webClient = webClientBuilder.build();
        this.circuitBreakerRegistry = circuitBreakerRegistry;
        this.meterRegistry = meterRegistry;

        // Initialize health cache
        healthCache.put("vllm", new EngineHealth());
        healthCache.put("gguf", new EngineHealth());

        // Register metrics gauges
        registerMetrics();

        log.info("HealthChecker initialized with timeout: {}s, failure threshold: {}, degraded latency: {}ms",
                healthCheckTimeoutSeconds, consecutiveFailuresThreshold, degradedLatencyThresholdMs);
    }

    private void registerMetrics() {
        for (String engine : new String[]{"vllm", "gguf"}) {
            EngineHealth health = healthCache.get(engine);

            Gauge.builder("llm.health.status", health,
                    h -> h.getStatus().ordinal())
                    .tag("engine", engine)
                    .description("Health status (0=HEALTHY, 1=DEGRADED, 2=UNHEALTHY, 3=UNKNOWN)")
                    .register(meterRegistry);

            Gauge.builder("llm.health.consecutive_failures", health,
                    h -> h.getConsecutiveFailures().get())
                    .tag("engine", engine)
                    .description("Number of consecutive health check failures")
                    .register(meterRegistry);

            Gauge.builder("llm.health.success_rate", health,
                    EngineHealth::getSuccessRate)
                    .tag("engine", engine)
                    .description("Health check success rate percentage")
                    .register(meterRegistry);

            Gauge.builder("llm.health.avg_latency_ms", health,
                    EngineHealth::getAverageLatencyMs)
                    .tag("engine", engine)
                    .description("Average health check latency in milliseconds")
                    .register(meterRegistry);

            Gauge.builder("llm.health.last_latency_ms", health,
                    h -> h.getLastLatencyMs().get())
                    .tag("engine", engine)
                    .description("Last health check latency in milliseconds")
                    .register(meterRegistry);
        }
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
                .timeout(Duration.ofSeconds(healthCheckTimeoutSeconds))
                .doOnSubscribe(s -> log.trace("Health check started for {}", engine))
                .subscribe(
                        response -> {
                            long latency = Duration.between(startTime, Instant.now()).toMillis();
                            health.recordSuccess(latency, degradedLatencyThresholdMs);
                            notifyCircuitBreakerSuccess(engine, latency);
                            log.trace("Health check OK: {} ({}ms, status={})",
                                    engine, latency, health.getStatus());
                        },
                        error -> {
                            long latency = Duration.between(startTime, Instant.now()).toMillis();
                            String errorMsg = error.getMessage();
                            health.recordFailure(errorMsg, consecutiveFailuresThreshold);
                            notifyCircuitBreakerError(engine, latency, error);
                            log.debug("Health check FAILED: {} - {} (status={})",
                                    engine, errorMsg, health.getStatus());
                        }
                );
    }

    /**
     * Perform a synchronous health check (for startup/recovery scenarios).
     */
    public Mono<Boolean> checkHealthSync(String engine) {
        String url = "vllm".equals(engine) ? vllmUrl : ggufUrl;
        EngineHealth health = healthCache.get(engine);
        Instant startTime = Instant.now();

        return webClient.get()
                .uri(url + "/health")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(healthCheckTimeoutSeconds))
                .map(response -> {
                    long latency = Duration.between(startTime, Instant.now()).toMillis();
                    health.recordSuccess(latency, degradedLatencyThresholdMs);
                    notifyCircuitBreakerSuccess(engine, latency);
                    return true;
                })
                .onErrorResume(error -> {
                    long latency = Duration.between(startTime, Instant.now()).toMillis();
                    health.recordFailure(error.getMessage(), consecutiveFailuresThreshold);
                    notifyCircuitBreakerError(engine, latency, error);
                    return Mono.just(false);
                });
    }

    private void notifyCircuitBreakerSuccess(String engine, long latencyMs) {
        try {
            CircuitBreaker cb = getCircuitBreaker(engine);
            cb.onSuccess(latencyMs, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.trace("Could not notify circuit breaker of success: {}", e.getMessage());
        }
    }

    private void notifyCircuitBreakerError(String engine, long latencyMs, Throwable error) {
        try {
            CircuitBreaker cb = getCircuitBreaker(engine);
            cb.onError(latencyMs, TimeUnit.MILLISECONDS, error);
        } catch (Exception e) {
            log.trace("Could not notify circuit breaker of error: {}", e.getMessage());
        }
    }

    /**
     * Check if an engine is healthy for receiving requests.
     */
    public boolean isHealthy(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health == null) {
            return false;
        }

        // Check circuit breaker state
        CircuitBreaker cb = getCircuitBreaker(engine);
        if (cb.getState() == CircuitBreaker.State.OPEN) {
            log.trace("Circuit breaker OPEN for engine: {}", engine);
            return false;
        }

        HealthStatus status = health.getStatus();
        // Treat UNKNOWN as healthy to allow first request, DEGRADED allows limited requests
        return status == HealthStatus.HEALTHY ||
               status == HealthStatus.UNKNOWN ||
               status == HealthStatus.DEGRADED;
    }

    /**
     * Check if engine is fully available (enabled, healthy, circuit not open).
     */
    public boolean isAvailable(String engine) {
        boolean enabled = "vllm".equals(engine) ? vllmEnabled : ggufEnabled;
        return enabled && isHealthy(engine);
    }

    /**
     * Check if engine is in degraded state (still accepting requests but with issues).
     */
    public boolean isDegraded(String engine) {
        EngineHealth health = healthCache.get(engine);
        return health != null && health.getStatus() == HealthStatus.DEGRADED;
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
        CircuitBreaker.Metrics cbMetrics = cb.getMetrics();

        Map<String, Object> details = new HashMap<>();
        details.put("status", health.getStatus().name());
        details.put("lastCheck", health.getLastCheck());
        details.put("lastSuccess", health.getLastSuccess());
        details.put("lastFailure", health.getLastFailure());
        details.put("consecutiveFailures", health.getConsecutiveFailures().get());
        details.put("consecutiveSuccesses", health.getConsecutiveSuccesses().get());
        details.put("totalRequests", health.getTotalRequests().get());
        details.put("failedRequests", health.getFailedRequests().get());
        details.put("averageLatencyMs", health.getAverageLatencyMs());
        details.put("lastLatencyMs", health.getLastLatencyMs().get());
        details.put("successRate", health.getSuccessRate());
        details.put("lastError", health.getLastError());

        // Circuit breaker details
        Map<String, Object> circuitBreaker = new HashMap<>();
        circuitBreaker.put("state", cb.getState().name());
        circuitBreaker.put("failureRate", cbMetrics.getFailureRate());
        circuitBreaker.put("slowCallRate", cbMetrics.getSlowCallRate());
        circuitBreaker.put("successfulCalls", cbMetrics.getNumberOfSuccessfulCalls());
        circuitBreaker.put("failedCalls", cbMetrics.getNumberOfFailedCalls());
        circuitBreaker.put("slowCalls", cbMetrics.getNumberOfSlowCalls());
        circuitBreaker.put("notPermittedCalls", cbMetrics.getNumberOfNotPermittedCalls());
        circuitBreaker.put("bufferedCalls", cbMetrics.getNumberOfBufferedCalls());
        details.put("circuitBreaker", circuitBreaker);

        return details;
    }

    /**
     * Get summary health status for all engines.
     */
    public Map<String, Object> getHealthSummary() {
        Map<String, Object> summary = new HashMap<>();

        for (String engine : new String[]{"vllm", "gguf"}) {
            EngineHealth health = healthCache.get(engine);
            CircuitBreaker cb = getCircuitBreaker(engine);

            Map<String, Object> engineSummary = new HashMap<>();
            engineSummary.put("status", health.getStatus().name());
            engineSummary.put("available", isAvailable(engine));
            engineSummary.put("degraded", isDegraded(engine));
            engineSummary.put("circuitBreakerState", cb.getState().name());
            engineSummary.put("successRate", String.format("%.1f%%", health.getSuccessRate()));
            engineSummary.put("avgLatency", String.format("%.0fms", health.getAverageLatencyMs()));

            summary.put(engine, engineSummary);
        }

        return summary;
    }

    /**
     * Mark an engine as healthy (called on successful request).
     */
    public void markHealthy(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.recordSuccess(0, degradedLatencyThresholdMs);
        }
    }

    /**
     * Mark an engine as unhealthy (called on failed request).
     */
    public void markUnhealthy(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.recordFailure("Marked unhealthy by gateway", consecutiveFailuresThreshold);
        }
    }

    /**
     * Mark an engine as unhealthy with specific error.
     */
    public void markUnhealthy(String engine, String error) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.recordFailure(error, consecutiveFailuresThreshold);
        }
    }

    /**
     * Reset health state for an engine (for testing/admin purposes).
     */
    public void resetHealth(String engine) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.reset();
            log.info("Health state reset for engine: {}", engine);
        }
    }

    public CircuitBreaker getCircuitBreaker(String engine) {
        return circuitBreakerRegistry.circuitBreaker(engine + "-gateway");
    }

    /**
     * Record request latency from gateway (for health metrics).
     */
    public void recordRequestLatency(String engine, long latencyMs) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.totalRequests.incrementAndGet();
            health.totalLatencyMs.addAndGet(latencyMs);
            health.lastLatencyMs.set(latencyMs);
        }
    }

    /**
     * Record a request error from gateway.
     */
    public void recordRequestError(String engine, String error) {
        EngineHealth health = healthCache.get(engine);
        if (health != null) {
            health.totalRequests.incrementAndGet();
            health.failedRequests.incrementAndGet();
            health.lastError = error;
        }
    }
}
