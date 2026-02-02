package com.insuretech.pms.chat.config;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.io.IOException;
import java.net.ConnectException;
import java.time.Duration;
import java.util.concurrent.TimeoutException;

/**
 * Circuit Breaker, Retry, and Time Limiter configuration for LLM Gateway.
 *
 * This configuration provides resilience patterns for handling transient failures
 * when communicating with LLM workers (GGUF and vLLM engines).
 *
 * <p>Circuit Breaker States:</p>
 * <ul>
 *   <li>CLOSED: Normal operation, requests flow through</li>
 *   <li>OPEN: Failure threshold exceeded, requests fail fast</li>
 *   <li>HALF_OPEN: Trial period to test if service recovered</li>
 * </ul>
 */
@Slf4j
@Configuration
public class CircuitBreakerConfig {

    // Circuit Breaker Configuration
    @Value("${llm.circuitbreaker.sliding-window-size:20}")
    private int slidingWindowSize;

    @Value("${llm.circuitbreaker.failure-rate-threshold:50}")
    private float failureRateThreshold;

    @Value("${llm.circuitbreaker.slow-call-rate-threshold:50}")
    private float slowCallRateThreshold;

    @Value("${llm.circuitbreaker.slow-call-duration-threshold:15}")
    private int slowCallDurationThresholdSeconds;

    @Value("${llm.circuitbreaker.wait-duration-in-open-state:30}")
    private int waitDurationInOpenStateSeconds;

    @Value("${llm.circuitbreaker.permitted-calls-in-half-open:5}")
    private int permittedCallsInHalfOpen;

    @Value("${llm.circuitbreaker.minimum-calls:10}")
    private int minimumNumberOfCalls;

    // Retry Configuration
    @Value("${llm.retry.max-attempts:3}")
    private int maxRetryAttempts;

    @Value("${llm.retry.wait-duration:1000}")
    private int retryWaitDurationMs;

    @Value("${llm.retry.exponential-backoff-multiplier:2}")
    private double exponentialBackoffMultiplier;

    @Value("${llm.retry.max-wait-duration:10000}")
    private int maxRetryWaitDurationMs;

    // Time Limiter Configuration
    @Value("${llm.timelimiter.timeout:120}")
    private int timeLimiterTimeoutSeconds;

    /**
     * Creates a custom CircuitBreakerRegistry with LLM-specific configuration.
     * Separate circuit breakers are created for each engine (vllm, gguf).
     */
    @Bean
    public CircuitBreakerRegistry llmCircuitBreakerRegistry() {
        io.github.resilience4j.circuitbreaker.CircuitBreakerConfig defaultConfig =
            io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.custom()
                .slidingWindowType(io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(slidingWindowSize)
                .failureRateThreshold(failureRateThreshold)
                .slowCallRateThreshold(slowCallRateThreshold)
                .slowCallDurationThreshold(Duration.ofSeconds(slowCallDurationThresholdSeconds))
                .waitDurationInOpenState(Duration.ofSeconds(waitDurationInOpenStateSeconds))
                .permittedNumberOfCallsInHalfOpenState(permittedCallsInHalfOpen)
                .minimumNumberOfCalls(minimumNumberOfCalls)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .recordExceptions(
                    IOException.class,
                    TimeoutException.class,
                    ConnectException.class,
                    WebClientRequestException.class
                )
                .ignoreExceptions(
                    IllegalArgumentException.class,
                    IllegalStateException.class
                )
                .build();

        CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(defaultConfig);

        // Register event consumers for monitoring
        registry.getEventPublisher()
            .onEntryAdded(event -> {
                CircuitBreaker cb = event.getAddedEntry();
                cb.getEventPublisher()
                    .onStateTransition(e -> log.info(
                        "Circuit breaker [{}] state transition: {} -> {}",
                        cb.getName(), e.getStateTransition().getFromState(),
                        e.getStateTransition().getToState()))
                    .onError(e -> log.debug(
                        "Circuit breaker [{}] recorded error: {}",
                        cb.getName(), e.getThrowable().getMessage()))
                    .onSuccess(e -> log.trace(
                        "Circuit breaker [{}] recorded success, duration: {}ms",
                        cb.getName(), e.getElapsedDuration().toMillis()));
            });

        // Pre-create circuit breakers for known engines
        registry.circuitBreaker("vllm-gateway");
        registry.circuitBreaker("gguf-gateway");

        log.info("LLM CircuitBreakerRegistry initialized with sliding window size: {}, " +
                "failure rate threshold: {}%, slow call threshold: {}%",
            slidingWindowSize, failureRateThreshold, slowCallRateThreshold);

        return registry;
    }

    /**
     * Creates a RetryRegistry with exponential backoff for transient failures.
     * Retries are triggered only for recoverable exceptions.
     */
    @Bean
    public RetryRegistry llmRetryRegistry() {
        RetryConfig defaultConfig = RetryConfig.custom()
            .maxAttempts(maxRetryAttempts)
            .intervalFunction(io.github.resilience4j.core.IntervalFunction.ofExponentialBackoff(
                Duration.ofMillis(retryWaitDurationMs),
                exponentialBackoffMultiplier,
                Duration.ofMillis(maxRetryWaitDurationMs)
            ))
            .retryOnException(throwable -> isRetryableException(throwable))
            .retryExceptions(
                ConnectException.class,
                WebClientRequestException.class,
                IOException.class
            )
            .ignoreExceptions(
                WebClientResponseException.BadRequest.class,
                WebClientResponseException.Unauthorized.class,
                WebClientResponseException.Forbidden.class,
                IllegalArgumentException.class
            )
            .failAfterMaxAttempts(true)
            .build();

        RetryRegistry registry = RetryRegistry.of(defaultConfig);

        // Register event consumers for monitoring
        registry.getEventPublisher()
            .onEntryAdded(event -> {
                Retry retry = event.getAddedEntry();
                retry.getEventPublisher()
                    .onRetry(e -> log.warn(
                        "Retry [{}] attempt #{} after {}ms, cause: {}",
                        retry.getName(), e.getNumberOfRetryAttempts(),
                        e.getWaitInterval().toMillis(),
                        e.getLastThrowable().getMessage()))
                    .onError(e -> log.error(
                        "Retry [{}] exhausted after {} attempts, cause: {}",
                        retry.getName(), e.getNumberOfRetryAttempts(),
                        e.getLastThrowable().getMessage()))
                    .onSuccess(e -> log.debug(
                        "Retry [{}] succeeded after {} attempts",
                        retry.getName(), e.getNumberOfRetryAttempts()));
            });

        // Pre-create retry instances for known engines
        registry.retry("vllm-gateway");
        registry.retry("gguf-gateway");

        log.info("LLM RetryRegistry initialized with max attempts: {}, " +
                "initial wait: {}ms, multiplier: {}",
            maxRetryAttempts, retryWaitDurationMs, exponentialBackoffMultiplier);

        return registry;
    }

    /**
     * Creates a TimeLimiterRegistry for request timeout handling.
     */
    @Bean
    public TimeLimiterRegistry llmTimeLimiterRegistry() {
        TimeLimiterConfig defaultConfig = TimeLimiterConfig.custom()
            .timeoutDuration(Duration.ofSeconds(timeLimiterTimeoutSeconds))
            .cancelRunningFuture(true)
            .build();

        TimeLimiterRegistry registry = TimeLimiterRegistry.of(defaultConfig);

        // Pre-create time limiters for known engines
        registry.timeLimiter("vllm-gateway");
        registry.timeLimiter("gguf-gateway");

        log.info("LLM TimeLimiterRegistry initialized with timeout: {}s", timeLimiterTimeoutSeconds);

        return registry;
    }

    /**
     * Determines if an exception is retryable.
     *
     * @param throwable the exception to check
     * @return true if the exception represents a transient failure that may succeed on retry
     */
    private boolean isRetryableException(Throwable throwable) {
        // Connection failures are retryable
        if (throwable instanceof ConnectException ||
            throwable instanceof WebClientRequestException) {
            return true;
        }

        // IOExceptions (excluding certain subtypes) are retryable
        if (throwable instanceof IOException) {
            return true;
        }

        // 5xx server errors are retryable
        if (throwable instanceof WebClientResponseException responseException) {
            int statusCode = responseException.getStatusCode().value();
            return statusCode >= 500 && statusCode < 600 && statusCode != 501;
        }

        // Timeout exceptions are retryable
        if (throwable instanceof TimeoutException) {
            return true;
        }

        // Check wrapped cause
        if (throwable.getCause() != null && throwable.getCause() != throwable) {
            return isRetryableException(throwable.getCause());
        }

        return false;
    }

    /**
     * Get circuit breaker for a specific engine.
     */
    public CircuitBreaker getCircuitBreaker(CircuitBreakerRegistry registry, String engine) {
        return registry.circuitBreaker(engine + "-gateway");
    }

    /**
     * Get retry instance for a specific engine.
     */
    public Retry getRetry(RetryRegistry registry, String engine) {
        return registry.retry(engine + "-gateway");
    }

    /**
     * Get time limiter for a specific engine.
     */
    public TimeLimiter getTimeLimiter(TimeLimiterRegistry registry, String engine) {
        return registry.timeLimiter(engine + "-gateway");
    }
}
