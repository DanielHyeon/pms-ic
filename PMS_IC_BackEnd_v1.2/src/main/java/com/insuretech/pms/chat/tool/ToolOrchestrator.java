package com.insuretech.pms.chat.tool;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.dto.sse.ToolCallEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * Orchestrates tool execution for LLM tool calls
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ToolOrchestrator {

    private final ToolRegistry toolRegistry;
    private final ObjectMapper objectMapper;

    private static final Duration TOOL_TIMEOUT = Duration.ofSeconds(30);

    public Mono<ToolResult> executeTool(ToolCallEvent toolCall, ToolContext context) {
        String toolName = toolCall.getName();
        String toolCallId = toolCall.getId();

        log.info("Executing tool: name={}, id={}, traceId={}", toolName, toolCallId, context.getTraceId());

        return toolRegistry.get(toolName)
                .map(executor -> executeWithTimeout(executor, toolCallId, toolCall.getArguments(), context))
                .orElseGet(() -> {
                    log.warn("Unknown tool: {}", toolName);
                    return Mono.just(ToolResult.failure(toolCallId, toolName, "Unknown tool: " + toolName));
                });
    }

    private Mono<ToolResult> executeWithTimeout(
            ToolExecutor executor,
            String toolCallId,
            String argumentsJson,
            ToolContext context) {

        return Mono.defer(() -> {
            try {
                Map<String, Object> arguments = parseArguments(argumentsJson);
                return executor.execute(toolCallId, arguments, context);
            } catch (Exception e) {
                log.error("Tool execution failed: {}", e.getMessage(), e);
                return Mono.just(ToolResult.failure(toolCallId, executor.getName(), e.getMessage()));
            }
        })
        .timeout(TOOL_TIMEOUT)
        .onErrorResume(e -> {
            log.error("Tool execution error: {}", e.getMessage());
            String error = e.getMessage();
            if (error != null && error.contains("timeout")) {
                error = "Tool execution timeout";
            }
            return Mono.just(ToolResult.failure(toolCallId, executor.getName(), error));
        });
    }

    private Map<String, Object> parseArguments(String argumentsJson) {
        if (argumentsJson == null || argumentsJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(argumentsJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Failed to parse arguments: {}", argumentsJson);
            return Map.of();
        }
    }
}
