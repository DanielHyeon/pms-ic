package com.insuretech.pms.chat.dto.sse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Done event - signals stream completion
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoneEvent {
    @JsonProperty("finish_reason")
    private String finishReason; // "stop" | "tool_calls" | "length"

    private UsageInfo usage;

    @JsonProperty("tool_calls")
    private List<ToolCallEvent> toolCalls;

    public static DoneEvent stop() {
        return DoneEvent.builder()
                .finishReason("stop")
                .build();
    }

    public static DoneEvent toolCalls() {
        return DoneEvent.builder()
                .finishReason("tool_calls")
                .build();
    }

    public static DoneEvent toolCalls(List<ToolCallEvent> toolCalls) {
        return DoneEvent.builder()
                .finishReason("tool_calls")
                .toolCalls(toolCalls)
                .build();
    }

    public boolean hasToolCalls() {
        return "tool_calls".equals(finishReason) && toolCalls != null && !toolCalls.isEmpty();
    }
}
