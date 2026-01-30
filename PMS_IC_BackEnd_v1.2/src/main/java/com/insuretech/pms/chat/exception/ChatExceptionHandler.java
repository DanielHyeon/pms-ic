package com.insuretech.pms.chat.exception;

import com.insuretech.pms.common.exception.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Exception handler for chat-specific exceptions.
 * Provides consistent error responses for chat API errors.
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.insuretech.pms.chat")
@Order(1) // Higher priority than global handler
public class ChatExceptionHandler {

    @ExceptionHandler(ChatException.class)
    public Mono<ResponseEntity<ChatErrorResponse>> handleChatException(
            ChatException ex,
            ServerWebExchange exchange) {

        log.error("ChatException: code={}, traceId={}, message={}",
                ex.getErrorCode(), ex.getTraceId(), ex.getMessage());

        ChatErrorResponse errorResponse = ChatErrorResponse.builder()
                .timestamp(java.time.LocalDateTime.now())
                .status(ex.getStatus().value())
                .error(ex.getStatus().getReasonPhrase())
                .message(ex.getMessage())
                .path(exchange.getRequest().getPath().value())
                .errorCode(ex.getErrorCode())
                .traceId(ex.getTraceId())
                .build();

        return Mono.just(new ResponseEntity<>(errorResponse, ex.getStatus()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public Mono<ResponseEntity<ChatErrorResponse>> handleIllegalArgumentException(
            IllegalArgumentException ex,
            ServerWebExchange exchange) {

        log.warn("IllegalArgumentException in chat controller: {}", ex.getMessage());

        ChatErrorResponse errorResponse = ChatErrorResponse.builder()
                .timestamp(java.time.LocalDateTime.now())
                .status(400)
                .error("Bad Request")
                .message(ex.getMessage())
                .path(exchange.getRequest().getPath().value())
                .errorCode("CHAT_INVALID_ARGUMENT")
                .build();

        return Mono.just(ResponseEntity.badRequest().body(errorResponse));
    }
}
