package com.insuretech.pms.chat.gateway;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import jakarta.annotation.PostConstruct;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiter for LLM engine requests.
 *
 * Uses semaphores to limit concurrent requests per engine:
 * - GGUF: Limited concurrent requests (CPU-bound, single model instance)
 * - vLLM: Higher concurrency (GPU batching, continuous batching)
 *
 * Also tracks per-user limits to prevent abuse.
 */
@Slf4j
@Component
public class RateLimiter {

    private final MeterRegistry meterRegistry;

    @Value("${llm.workers.gguf.max-concurrent:2}")
    private int ggufMaxConcurrent;

    @Value("${llm.workers.vllm.max-concurrent:10}")
    private int vllmMaxConcurrent;

    @Value("${llm.rate-limit.per-user:5}")
    private int perUserMaxConcurrent;

    @Value("${llm.rate-limit.acquire-timeout:30}")
    private int acquireTimeoutSeconds;

    private Semaphore ggufSemaphore;
    private Semaphore vllmSemaphore;
    private final Map<String, Semaphore> userSemaphores = new ConcurrentHashMap<>();

    private final AtomicInteger ggufActiveRequests = new AtomicInteger(0);
    private final AtomicInteger vllmActiveRequests = new AtomicInteger(0);
    private final AtomicInteger totalActiveRequests = new AtomicInteger(0);

    public RateLimiter(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void init() {
        ggufSemaphore = new Semaphore(ggufMaxConcurrent);
        vllmSemaphore = new Semaphore(vllmMaxConcurrent);

        log.info("Rate limiter initialized: GGUF={}, vLLM={}, perUser={}",
                ggufMaxConcurrent, vllmMaxConcurrent, perUserMaxConcurrent);

        // Register metrics
        Gauge.builder("llm.rate_limit.active_requests", ggufActiveRequests, AtomicInteger::get)
                .tag("engine", "gguf")
                .register(meterRegistry);

        Gauge.builder("llm.rate_limit.active_requests", vllmActiveRequests, AtomicInteger::get)
                .tag("engine", "vllm")
                .register(meterRegistry);

        Gauge.builder("llm.rate_limit.total_active", totalActiveRequests, AtomicInteger::get)
                .register(meterRegistry);

        Gauge.builder("llm.rate_limit.available_permits", ggufSemaphore, Semaphore::availablePermits)
                .tag("engine", "gguf")
                .register(meterRegistry);

        Gauge.builder("llm.rate_limit.available_permits", vllmSemaphore, Semaphore::availablePermits)
                .tag("engine", "vllm")
                .register(meterRegistry);
    }

    /**
     * Acquire a permit for the specified engine and user.
     *
     * @param engine The engine to acquire permit for (gguf/vllm)
     * @param userId The user ID for per-user limiting (can be null)
     * @return Mono that completes when permit is acquired, or errors if rate limited
     */
    public Mono<RateLimitPermit> acquire(String engine, String userId) {
        return Mono.fromCallable(() -> {
            Semaphore engineSemaphore = getEngineSemaphore(engine);
            Semaphore userSemaphore = userId != null ? getUserSemaphore(userId) : null;

            boolean engineAcquired = false;
            boolean userAcquired = false;

            try {
                // Try to acquire engine permit
                engineAcquired = engineSemaphore.tryAcquire(acquireTimeoutSeconds, TimeUnit.SECONDS);
                if (!engineAcquired) {
                    throw new RateLimitExceededException(
                            String.format("Engine %s rate limit exceeded (max concurrent: %d)",
                                    engine, getMaxConcurrent(engine)));
                }

                // Try to acquire user permit if user is specified
                if (userSemaphore != null) {
                    userAcquired = userSemaphore.tryAcquire(0, TimeUnit.SECONDS);
                    if (!userAcquired) {
                        engineSemaphore.release();
                        engineAcquired = false;
                        throw new RateLimitExceededException(
                                String.format("User %s rate limit exceeded (max concurrent: %d)",
                                        userId, perUserMaxConcurrent));
                    }
                }

                // Track active requests
                incrementActiveRequests(engine);

                log.debug("Permit acquired: engine={}, user={}, activeGguf={}, activeVllm={}",
                        engine, userId, ggufActiveRequests.get(), vllmActiveRequests.get());

                return new RateLimitPermit(engine, userId, engineSemaphore, userSemaphore);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                if (engineAcquired) engineSemaphore.release();
                throw new RateLimitExceededException("Interrupted while acquiring rate limit permit");
            }
        });
    }

    /**
     * Release permits after request completion.
     */
    public void release(RateLimitPermit permit) {
        if (permit == null) return;

        permit.getEngineSemaphore().release();
        if (permit.getUserSemaphore() != null) {
            permit.getUserSemaphore().release();
        }

        decrementActiveRequests(permit.getEngine());

        log.debug("Permit released: engine={}, user={}, activeGguf={}, activeVllm={}",
                permit.getEngine(), permit.getUserId(),
                ggufActiveRequests.get(), vllmActiveRequests.get());
    }

    private Semaphore getEngineSemaphore(String engine) {
        if ("vllm".equalsIgnoreCase(engine)) {
            return vllmSemaphore;
        }
        return ggufSemaphore; // Default to GGUF
    }

    private int getMaxConcurrent(String engine) {
        if ("vllm".equalsIgnoreCase(engine)) {
            return vllmMaxConcurrent;
        }
        return ggufMaxConcurrent;
    }

    private Semaphore getUserSemaphore(String userId) {
        return userSemaphores.computeIfAbsent(userId,
                k -> new Semaphore(perUserMaxConcurrent));
    }

    private void incrementActiveRequests(String engine) {
        totalActiveRequests.incrementAndGet();
        if ("vllm".equalsIgnoreCase(engine)) {
            vllmActiveRequests.incrementAndGet();
        } else {
            ggufActiveRequests.incrementAndGet();
        }
    }

    private void decrementActiveRequests(String engine) {
        totalActiveRequests.decrementAndGet();
        if ("vllm".equalsIgnoreCase(engine)) {
            vllmActiveRequests.decrementAndGet();
        } else {
            ggufActiveRequests.decrementAndGet();
        }
    }

    /**
     * Get current active request count for an engine.
     */
    public int getActiveRequests(String engine) {
        if ("vllm".equalsIgnoreCase(engine)) {
            return vllmActiveRequests.get();
        }
        return ggufActiveRequests.get();
    }

    /**
     * Get available permits for an engine.
     */
    public int getAvailablePermits(String engine) {
        return getEngineSemaphore(engine).availablePermits();
    }

    /**
     * Permit holder for rate limit tracking.
     */
    public static class RateLimitPermit {
        private final String engine;
        private final String userId;
        private final Semaphore engineSemaphore;
        private final Semaphore userSemaphore;

        public RateLimitPermit(String engine, String userId,
                               Semaphore engineSemaphore, Semaphore userSemaphore) {
            this.engine = engine;
            this.userId = userId;
            this.engineSemaphore = engineSemaphore;
            this.userSemaphore = userSemaphore;
        }

        public String getEngine() { return engine; }
        public String getUserId() { return userId; }
        public Semaphore getEngineSemaphore() { return engineSemaphore; }
        public Semaphore getUserSemaphore() { return userSemaphore; }
    }

    /**
     * Exception thrown when rate limit is exceeded.
     */
    public static class RateLimitExceededException extends RuntimeException {
        public RateLimitExceededException(String message) {
            super(message);
        }
    }
}
