package com.insuretech.pms.chat.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.dto.ChatMessageDto;
import com.insuretech.pms.chat.dto.sse.*;
import com.insuretech.pms.chat.gateway.LlmGatewayService;
import com.insuretech.pms.chat.gateway.dto.GatewayRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Orchestrates streaming LLM responses with tool calling support.
 *
 * When the LLM requests tool calls:
 * 1. Detects tool_calls finish reason
 * 2. Executes the tools
 * 3. Appends tool results to messages
 * 4. Re-invokes the LLM
 * 5. Continues streaming to the client
 *
 * This creates a seamless experience where tools are executed
 * transparently during the stream.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StreamingToolOrchestrator {

    private final ToolOrchestrator toolOrchestrator;
    private final ObjectMapper objectMapper;
    private final SseEventBuilder sseBuilder;

    private static final int MAX_TOOL_ITERATIONS = 5;

    /**
     * Stream with tool calling support.
     *
     * @param gatewayService The gateway service to call LLM
     * @param request The original request
     * @param context Tool execution context
     * @return Flux of SSE events with tool calls handled automatically
     */
    public Flux<ServerSentEvent<String>> streamWithTools(
            LlmGatewayService gatewayService,
            GatewayRequest request,
            ToolContext context) {

        return streamWithToolsRecursive(gatewayService, request, context, new AtomicInteger(0));
    }

    private Flux<ServerSentEvent<String>> streamWithToolsRecursive(
            LlmGatewayService gatewayService,
            GatewayRequest request,
            ToolContext context,
            AtomicInteger iteration) {

        if (iteration.get() >= MAX_TOOL_ITERATIONS) {
            log.warn("Max tool iterations reached: traceId={}", request.getTraceId());
            return Flux.just(sseBuilder.error("MAX_TOOL_ITERATIONS",
                    "Maximum tool call iterations exceeded", request.getTraceId()));
        }

        // Accumulate the response to detect tool calls
        StringBuilder textBuffer = new StringBuilder();
        List<ToolCallEvent> pendingToolCalls = new ArrayList<>();
        Sinks.Many<ServerSentEvent<String>> outputSink = Sinks.many().unicast().onBackpressureBuffer();

        return gatewayService.streamChat(request)
                .doOnNext(event -> {
                    String eventName = event.event();
                    String data = event.data();

                    if ("delta".equals(eventName)) {
                        // Pass through text deltas
                        DeltaEvent delta = parseJsonSafely(data, DeltaEvent.class);
                        if (delta != null) {
                            if (delta.getKind() == DeltaKind.TEXT && delta.getText() != null) {
                                textBuffer.append(delta.getText());
                                outputSink.tryEmitNext(event);
                            } else if (delta.getKind() == DeltaKind.TOOL_CALL_DELTA) {
                                // Don't emit tool call deltas to client by default
                                // (or emit if you want to show progress)
                                log.debug("Tool call delta: {}", delta.getToolCall());
                            }
                        }
                    } else if ("meta".equals(eventName)) {
                        // Pass through meta
                        outputSink.tryEmitNext(event);
                    } else if ("done".equals(eventName)) {
                        // Check if we have tool calls to execute
                        DoneEvent done = parseJsonSafely(data, DoneEvent.class);
                        if (done != null && done.hasToolCalls()) {
                            pendingToolCalls.addAll(done.getToolCalls());
                            log.info("Tool calls detected: count={}, traceId={}",
                                    pendingToolCalls.size(), request.getTraceId());
                        }
                    } else if ("error".equals(eventName)) {
                        outputSink.tryEmitNext(event);
                    }
                })
                .doOnComplete(() -> {
                    if (!pendingToolCalls.isEmpty()) {
                        // Execute tools and continue
                        executeToolsAndContinue(
                                gatewayService, request, context,
                                pendingToolCalls, textBuffer.toString(),
                                outputSink, iteration
                        );
                    } else {
                        // No tool calls, complete the stream
                        outputSink.tryEmitNext(sseBuilder.doneStop());
                        outputSink.tryEmitComplete();
                    }
                })
                .doOnError(e -> {
                    log.error("Stream error: {}", e.getMessage());
                    outputSink.tryEmitNext(sseBuilder.error("STREAM_ERROR",
                            e.getMessage(), request.getTraceId()));
                    outputSink.tryEmitComplete();
                })
                .thenMany(outputSink.asFlux());
    }

    private void executeToolsAndContinue(
            LlmGatewayService gatewayService,
            GatewayRequest originalRequest,
            ToolContext context,
            List<ToolCallEvent> toolCalls,
            String assistantText,
            Sinks.Many<ServerSentEvent<String>> outputSink,
            AtomicInteger iteration) {

        // Execute all tool calls
        Flux.fromIterable(toolCalls)
                .flatMap(toolCall -> toolOrchestrator.executeTool(toolCall, context))
                .collectList()
                .flatMapMany(results -> {
                    // Build updated messages with tool results
                    GatewayRequest nextRequest = buildNextRequest(
                            originalRequest, assistantText, toolCalls, results
                    );

                    iteration.incrementAndGet();
                    log.info("Continuing with tool results: iteration={}, traceId={}",
                            iteration.get(), originalRequest.getTraceId());

                    // Recursively continue the stream
                    return streamWithToolsRecursive(gatewayService, nextRequest, context, iteration);
                })
                .subscribe(
                        outputSink::tryEmitNext,
                        error -> {
                            log.error("Tool execution error: {}", error.getMessage());
                            outputSink.tryEmitNext(sseBuilder.error("TOOL_ERROR",
                                    error.getMessage(), originalRequest.getTraceId()));
                            outputSink.tryEmitComplete();
                        },
                        outputSink::tryEmitComplete
                );
    }

    private GatewayRequest buildNextRequest(
            GatewayRequest original,
            String assistantText,
            List<ToolCallEvent> toolCalls,
            List<ToolResult> toolResults) {

        List<ChatMessageDto> messages = new ArrayList<>(original.getMessages());

        // Add assistant message with tool calls
        List<Map<String, Object>> toolCallMaps = toolCalls.stream()
                .map(this::toolCallToMap)
                .toList();

        messages.add(ChatMessageDto.builder()
                .role("assistant")
                .content(assistantText.isEmpty() ? null : assistantText)
                .toolCalls(toolCallMaps)
                .build());

        // Add tool results
        for (ToolResult result : toolResults) {
            messages.add(ChatMessageDto.builder()
                    .role("tool")
                    .toolCallId(result.getToolCallId())
                    .name(result.getToolName())
                    .content(result.isSuccess() ? result.getContent() : result.getError())
                    .build());
        }

        return GatewayRequest.builder()
                .traceId(original.getTraceId())
                .engine(original.getEngine())
                .stream(true)
                .messages(messages)
                .tools(original.getTools())
                .responseFormat(original.getResponseFormat())
                .generation(original.getGeneration())
                .safety(original.getSafety())
                .build();
    }

    private Map<String, Object> toolCallToMap(ToolCallEvent toolCall) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", toolCall.getId());
        map.put("type", "function");
        map.put("function", Map.of(
                "name", toolCall.getName(),
                "arguments", toolCall.getArguments()
        ));
        return map;
    }

    private <T> T parseJsonSafely(String json, Class<T> type) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            log.warn("Failed to parse JSON: {}", e.getMessage());
            return null;
        }
    }
}
