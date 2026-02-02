package com.insuretech.pms.chat.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Standardized error response for chat API errors.
 * Includes trace ID for debugging streaming errors.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatErrorResponse {

    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private String errorCode;
    private String traceId;

    /**
     * Creates an error response for stream errors.
     */
    public static ChatErrorResponse streamError(String errorCode, String message, String traceId) {
        return ChatErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(500)
                .error("Internal Server Error")
                .message(message)
                .errorCode(errorCode)
                .traceId(traceId)
                .build();
    }

    /**
     * Creates an error response for validation errors.
     */
    public static ChatErrorResponse validationError(String message, String path) {
        return ChatErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(400)
                .error("Bad Request")
                .message(message)
                .path(path)
                .errorCode("CHAT_VALIDATION_ERROR")
                .build();
    }
}
