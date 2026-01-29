package com.insuretech.pms.chat.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.dto.sse.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.Objects;

/**
 * Transforms OpenAI-compatible SSE format to Standard SSE format
 *
 * Input:  data: {"choices":[{"delta":{"content":"text"}}]}
 * Output: event: delta\ndata: {"kind":"text","text":"text"}
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiSseTransformer {

    private final ObjectMapper objectMapper;
    private final SseEventBuilder sseBuilder;

    public Flux<ServerSentEvent<String>> transformOpenAiSse(Flux<String> upstream) {
        return upstream
                .filter(line -> line.startsWith("data: "))
                .map(line -> line.substring(6).trim())
                .filter(data -> !data.equals("[DONE]"))
                .map(this::parseAndTransform)
                .filter(Objects::nonNull)
                .concatWith(Flux.just(sseBuilder.doneStop()));
    }

    private ServerSentEvent<String> parseAndTransform(String jsonData) {
        try {
            JsonNode root = objectMapper.readTree(jsonData);
            JsonNode choices = root.path("choices");

            if (choices.isEmpty() || choices.isNull()) {
                return null;
            }

            JsonNode firstChoice = choices.get(0);
            JsonNode delta = firstChoice.path("delta");

            // Check for content (text)
            if (delta.has("content") && !delta.get("content").isNull()) {
                String content = delta.get("content").asText();
                if (!content.isEmpty()) {
                    return sseBuilder.deltaText(content);
                }
            }

            // Check for tool calls
            if (delta.has("tool_calls") && !delta.get("tool_calls").isNull()) {
                JsonNode toolCalls = delta.get("tool_calls");
                return buildToolCallDelta(toolCalls);
            }

            // Check for finish reason (skip, will emit done at end)
            JsonNode finishReason = firstChoice.path("finish_reason");
            if (!finishReason.isNull() && !finishReason.asText().isEmpty()) {
                log.debug("Finish reason: {}", finishReason.asText());
                return null;
            }

            return null;
        } catch (Exception e) {
            log.warn("Failed to parse OpenAI SSE: {}", jsonData, e);
            return null;
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
}
