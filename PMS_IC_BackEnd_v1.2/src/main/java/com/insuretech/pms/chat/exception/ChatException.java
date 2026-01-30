package com.insuretech.pms.chat.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base exception for chat-related errors.
 * Provides standardized error codes and HTTP status mapping.
 */
@Getter
public class ChatException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;
    private final String traceId;

    public ChatException(String message, HttpStatus status, String errorCode) {
        this(message, status, errorCode, null);
    }

    public ChatException(String message, HttpStatus status, String errorCode, String traceId) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
        this.traceId = traceId;
    }

    public ChatException(String message, HttpStatus status, String errorCode, String traceId, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
        this.traceId = traceId;
    }

    // Factory methods for common chat errors

    public static ChatException sessionNotFound(String sessionId) {
        return new ChatException(
                "Chat session not found: " + sessionId,
                HttpStatus.NOT_FOUND,
                "CHAT_SESSION_NOT_FOUND"
        );
    }

    public static ChatException sessionNotFound(String sessionId, String traceId) {
        return new ChatException(
                "Chat session not found: " + sessionId,
                HttpStatus.NOT_FOUND,
                "CHAT_SESSION_NOT_FOUND",
                traceId
        );
    }

    public static ChatException messageEmpty() {
        return new ChatException(
                "Message cannot be empty",
                HttpStatus.BAD_REQUEST,
                "CHAT_MESSAGE_EMPTY"
        );
    }

    public static ChatException messageTooLong(int maxLength) {
        return new ChatException(
                "Message exceeds maximum length of " + maxLength + " characters",
                HttpStatus.BAD_REQUEST,
                "CHAT_MESSAGE_TOO_LONG"
        );
    }

    public static ChatException engineNotAvailable(String engine) {
        return new ChatException(
                "LLM engine not available: " + engine,
                HttpStatus.SERVICE_UNAVAILABLE,
                "CHAT_ENGINE_UNAVAILABLE"
        );
    }

    public static ChatException engineNotAvailable(String engine, String traceId) {
        return new ChatException(
                "LLM engine not available: " + engine,
                HttpStatus.SERVICE_UNAVAILABLE,
                "CHAT_ENGINE_UNAVAILABLE",
                traceId
        );
    }

    public static ChatException streamError(String message, String traceId) {
        return new ChatException(
                "Stream processing error: " + message,
                HttpStatus.INTERNAL_SERVER_ERROR,
                "CHAT_STREAM_ERROR",
                traceId
        );
    }

    public static ChatException streamError(String message, String traceId, Throwable cause) {
        return new ChatException(
                "Stream processing error: " + message,
                HttpStatus.INTERNAL_SERVER_ERROR,
                "CHAT_STREAM_ERROR",
                traceId,
                cause
        );
    }

    public static ChatException toolExecutionError(String toolName, String message, String traceId) {
        return new ChatException(
                "Tool execution failed [" + toolName + "]: " + message,
                HttpStatus.INTERNAL_SERVER_ERROR,
                "CHAT_TOOL_ERROR",
                traceId
        );
    }

    public static ChatException rateLimitExceeded(String userId) {
        return new ChatException(
                "Rate limit exceeded for user: " + userId,
                HttpStatus.TOO_MANY_REQUESTS,
                "CHAT_RATE_LIMIT_EXCEEDED"
        );
    }

    public static ChatException unauthorized(String reason) {
        return new ChatException(
                "Unauthorized: " + reason,
                HttpStatus.UNAUTHORIZED,
                "CHAT_UNAUTHORIZED"
        );
    }

    public static ChatException forbidden(String reason) {
        return new ChatException(
                "Access forbidden: " + reason,
                HttpStatus.FORBIDDEN,
                "CHAT_FORBIDDEN"
        );
    }

    public static ChatException contextTooLarge(int maxMessages) {
        return new ChatException(
                "Context exceeds maximum of " + maxMessages + " messages",
                HttpStatus.BAD_REQUEST,
                "CHAT_CONTEXT_TOO_LARGE"
        );
    }

    public static ChatException internalError(String message, String traceId) {
        return new ChatException(
                message,
                HttpStatus.INTERNAL_SERVER_ERROR,
                "CHAT_INTERNAL_ERROR",
                traceId
        );
    }

    public static ChatException internalError(String message, String traceId, Throwable cause) {
        return new ChatException(
                message,
                HttpStatus.INTERNAL_SERVER_ERROR,
                "CHAT_INTERNAL_ERROR",
                traceId,
                cause
        );
    }
}
