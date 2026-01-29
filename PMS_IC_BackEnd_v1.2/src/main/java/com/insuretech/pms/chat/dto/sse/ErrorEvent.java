package com.insuretech.pms.chat.dto.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Error event - signals stream error
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorEvent {
    private String code;
    private String message;
    private String traceId;

    public static ErrorEvent of(String code, String message, String traceId) {
        return ErrorEvent.builder()
                .code(code)
                .message(message)
                .traceId(traceId)
                .build();
    }

    public static ErrorEvent timeout(String traceId) {
        return of("TIMEOUT", "Request timeout exceeded", traceId);
    }

    public static ErrorEvent streamError(String message, String traceId) {
        return of("STREAM_ERROR", message, traceId);
    }

    public static ErrorEvent engineUnavailable(String traceId) {
        return of("ENGINE_UNAVAILABLE", "No healthy LLM engine available", traceId);
    }
}
