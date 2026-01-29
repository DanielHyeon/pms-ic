package com.insuretech.pms.chat.dto.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Done event - signals stream completion
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoneEvent {
    private String finishReason; // "stop" | "tool_calls" | "length"
    private UsageInfo usage;

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
}
