package com.insuretech.pms.chat.dto.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Delta event - content chunk during streaming
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeltaEvent {
    private DeltaKind kind;
    private String text;        // for TEXT kind
    private ToolCallEvent toolCall;  // for TOOL_CALL kind
    private String json;        // for JSON kind

    public static DeltaEvent text(String text) {
        return DeltaEvent.builder()
                .kind(DeltaKind.TEXT)
                .text(text)
                .build();
    }

    public static DeltaEvent toolCall(ToolCallEvent toolCall) {
        return DeltaEvent.builder()
                .kind(DeltaKind.TOOL_CALL)
                .toolCall(toolCall)
                .build();
    }

    public static DeltaEvent json(String json) {
        return DeltaEvent.builder()
                .kind(DeltaKind.JSON)
                .json(json)
                .build();
    }
}
