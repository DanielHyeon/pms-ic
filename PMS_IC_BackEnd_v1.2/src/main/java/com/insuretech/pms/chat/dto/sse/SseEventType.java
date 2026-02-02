package com.insuretech.pms.chat.dto.sse;

/**
 * Standard SSE Event Types for LLM streaming
 */
public enum SseEventType {
    META,    // Metadata about the stream (engine, model, traceId)
    DELTA,   // Content chunks (text, tool_call, json)
    DONE,    // Stream completion
    ERROR    // Error termination
}
