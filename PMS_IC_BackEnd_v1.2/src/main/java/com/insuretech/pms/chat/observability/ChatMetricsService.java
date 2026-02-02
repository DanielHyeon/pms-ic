package com.insuretech.pms.chat.observability;

import io.micrometer.core.instrument.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Service for tracking chat and LLM metrics
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatMetricsService {

    private final MeterRegistry meterRegistry;
    private final ConcurrentHashMap<String, AtomicLong> activeStreams = new ConcurrentHashMap<>();

    // Chat metrics
    private static final String CHAT_REQUESTS_TOTAL = "chat.requests.total";
    private static final String CHAT_ACTIVE_STREAMS = "chat.active.streams";
    private static final String CHAT_SESSION_CREATED = "chat.session.created";
    private static final String CHAT_MESSAGE_SAVED = "chat.message.saved";

    // LLM metrics
    private static final String LLM_REQUEST_DURATION = "llm.request.duration";
    private static final String LLM_TOKENS_GENERATED = "llm.tokens.generated";
    private static final String LLM_TTFT = "llm.time.to.first.token";
    private static final String LLM_ERRORS = "llm.errors";

    public void recordChatRequest(String engine, String userId) {
        Counter.builder(CHAT_REQUESTS_TOTAL)
                .tag("engine", engine)
                .tag("user_type", userId.equals("guest") ? "guest" : "authenticated")
                .register(meterRegistry)
                .increment();
    }

    public void startStream(String traceId) {
        activeStreams.computeIfAbsent(traceId, k -> new AtomicLong(System.currentTimeMillis()));
        Gauge.builder(CHAT_ACTIVE_STREAMS, activeStreams, ConcurrentHashMap::size)
                .register(meterRegistry);
    }

    public void endStream(String traceId) {
        AtomicLong startTime = activeStreams.remove(traceId);
        if (startTime != null) {
            long durationMs = System.currentTimeMillis() - startTime.get();
            log.debug("Stream ended: traceId={}, durationMs={}", traceId, durationMs);
        }
    }

    public void recordSessionCreated() {
        Counter.builder(CHAT_SESSION_CREATED)
                .register(meterRegistry)
                .increment();
    }

    public void recordMessageSaved(String role) {
        Counter.builder(CHAT_MESSAGE_SAVED)
                .tag("role", role)
                .register(meterRegistry)
                .increment();
    }

    public void recordLlmDuration(String engine, Duration duration) {
        Timer.builder(LLM_REQUEST_DURATION)
                .tag("engine", engine)
                .register(meterRegistry)
                .record(duration);
    }

    public void recordTTFT(String engine, long ttftMs) {
        Timer.builder(LLM_TTFT)
                .tag("engine", engine)
                .register(meterRegistry)
                .record(ttftMs, TimeUnit.MILLISECONDS);
    }

    public void recordTokensGenerated(String engine, int tokens) {
        Counter.builder(LLM_TOKENS_GENERATED)
                .tag("engine", engine)
                .register(meterRegistry)
                .increment(tokens);
    }

    public void recordLlmError(String engine, String errorType) {
        Counter.builder(LLM_ERRORS)
                .tag("engine", engine)
                .tag("error_type", errorType)
                .register(meterRegistry)
                .increment();
    }

    public void recordABTest(String primaryEngine, String shadowEngine) {
        Counter.builder("chat.ab.tests")
                .tag("primary", primaryEngine)
                .tag("shadow", shadowEngine)
                .register(meterRegistry)
                .increment();
    }

    public void recordToolExecution(String toolName, boolean success, long durationMs) {
        Timer.builder("chat.tool.execution")
                .tag("tool", toolName)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }
}
