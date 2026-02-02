package com.insuretech.pms.chat.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.dto.sse.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Transforms OpenAI-compatible SSE format to Standard SSE format
 *
 * Input:  data: {"choices":[{"delta":{"content":"text"}}]}
 * Output: event: delta\ndata: {"kind":"text","text":"text"}
 *
 * Features:
 * - Accumulates streamed tool call arguments
 * - Emits complete TOOL_CALL event when finish_reason is "tool_calls"
 * - Supports multiple concurrent tool calls
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiSseTransformer {

    private final ObjectMapper objectMapper;
    private final SseEventBuilder sseBuilder;

    /**
     * Transform result containing both events and state
     */
    public record TransformResult(
            Flux<ServerSentEvent<String>> events,
            ToolCallAccumulator accumulator
    ) {}

    /**
     * Transform with tool call accumulation support
     */
    public TransformResult transformWithToolSupport(Flux<String> upstream) {
        ToolCallAccumulator accumulator = new ToolCallAccumulator();

        Flux<ServerSentEvent<String>> events = upstream
                .filter(line -> line.startsWith("data: "))
                .map(line -> line.substring(6).trim())
                .filter(data -> !data.equals("[DONE]"))
                .flatMapIterable(data -> parseAndTransformWithAccumulator(data, accumulator))
                .filter(Objects::nonNull)
                .concatWith(Flux.defer(() -> {
                    // At the end, check if we need to emit done or tool_calls
                    if (accumulator.hasCompletedToolCalls()) {
                        return Flux.just(sseBuilder.doneToolCalls(accumulator.getCompletedToolCalls()));
                    }
                    return Flux.just(sseBuilder.doneStop());
                }));

        return new TransformResult(events, accumulator);
    }

    /**
     * Simple transform (backward compatible)
     */
    public Flux<ServerSentEvent<String>> transformOpenAiSse(Flux<String> upstream) {
        return transformWithToolSupport(upstream).events();
    }

    private List<ServerSentEvent<String>> parseAndTransformWithAccumulator(
            String jsonData,
            ToolCallAccumulator accumulator) {
        try {
            JsonNode root = objectMapper.readTree(jsonData);
            JsonNode choices = root.path("choices");

            if (choices.isEmpty() || choices.isNull()) {
                return Collections.emptyList();
            }

            JsonNode firstChoice = choices.get(0);
            JsonNode delta = firstChoice.path("delta");
            String finishReason = firstChoice.path("finish_reason").asText(null);

            List<ServerSentEvent<String>> results = new ArrayList<>();

            // Check for content (text)
            if (delta.has("content") && !delta.get("content").isNull()) {
                String content = delta.get("content").asText();
                if (!content.isEmpty()) {
                    results.add(sseBuilder.deltaText(content));
                }
            }

            // Check for tool calls and accumulate
            if (delta.has("tool_calls") && !delta.get("tool_calls").isNull()) {
                JsonNode toolCalls = delta.get("tool_calls");
                accumulateToolCalls(toolCalls, accumulator);

                // Emit delta for streaming progress
                ServerSentEvent<String> deltaEvent = buildToolCallDelta(toolCalls);
                if (deltaEvent != null) {
                    results.add(deltaEvent);
                }
            }

            // Check for tool_calls finish reason
            if ("tool_calls".equals(finishReason)) {
                accumulator.markComplete();
                log.debug("Tool calls completed: {}", accumulator.getCompletedToolCalls().size());
            }

            return results;
        } catch (Exception e) {
            log.warn("Failed to parse OpenAI SSE: {}", jsonData, e);
            return Collections.emptyList();
        }
    }

    private void accumulateToolCalls(JsonNode toolCalls, ToolCallAccumulator accumulator) {
        if (!toolCalls.isArray()) return;

        for (JsonNode tc : toolCalls) {
            int index = tc.path("index").asInt(0);
            String id = tc.path("id").asText(null);
            JsonNode function = tc.path("function");
            String name = function.path("name").asText(null);
            String arguments = function.path("arguments").asText("");

            accumulator.accumulate(index, id, name, arguments);
        }
    }

    private ServerSentEvent<String> buildToolCallDelta(JsonNode toolCalls) {
        try {
            if (toolCalls.isArray() && !toolCalls.isEmpty()) {
                JsonNode firstToolCall = toolCalls.get(0);

                String id = firstToolCall.path("id").asText(null);
                JsonNode function = firstToolCall.path("function");
                String name = function.path("name").asText(null);
                String arguments = function.path("arguments").asText("");

                ToolCallEvent toolCall = ToolCallEvent.builder()
                        .id(id)
                        .name(name)
                        .arguments(arguments)
                        .build();

                DeltaEvent deltaEvent = DeltaEvent.builder()
                        .kind(DeltaKind.TOOL_CALL_DELTA)
                        .toolCall(toolCall)
                        .build();

                return sseBuilder.delta(deltaEvent);
            }
        } catch (Exception e) {
            log.warn("Failed to parse tool call: {}", toolCalls, e);
        }
        return null;
    }

    /**
     * Accumulates streaming tool call fragments
     */
    public static class ToolCallAccumulator {
        private final Map<Integer, ToolCallBuilder> builders = new ConcurrentHashMap<>();
        private volatile boolean complete = false;

        public void accumulate(int index, String id, String name, String argumentsChunk) {
            builders.computeIfAbsent(index, ToolCallBuilder::new)
                    .accumulate(id, name, argumentsChunk);
        }

        public void markComplete() {
            this.complete = true;
        }

        public boolean hasCompletedToolCalls() {
            return complete && !builders.isEmpty();
        }

        public List<ToolCallEvent> getCompletedToolCalls() {
            return builders.values().stream()
                    .map(ToolCallBuilder::build)
                    .filter(Objects::nonNull)
                    .toList();
        }

        public boolean isComplete() {
            return complete;
        }

        public void reset() {
            builders.clear();
            complete = false;
        }
    }

    private static class ToolCallBuilder {
        private final int index;
        private String id;
        private String name;
        private final StringBuilder arguments = new StringBuilder();

        ToolCallBuilder(int index) {
            this.index = index;
        }

        void accumulate(String id, String name, String argumentsChunk) {
            if (id != null && !id.isEmpty()) {
                this.id = id;
            }
            if (name != null && !name.isEmpty()) {
                this.name = name;
            }
            if (argumentsChunk != null) {
                arguments.append(argumentsChunk);
            }
        }

        ToolCallEvent build() {
            if (id == null || name == null) {
                return null;
            }
            return ToolCallEvent.builder()
                    .id(id)
                    .name(name)
                    .arguments(arguments.toString())
                    .build();
        }
    }
}
