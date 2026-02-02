package com.insuretech.pms.chat.dto.sse;

/**
 * Delta event content types
 */
public enum DeltaKind {
    TEXT,            // User-visible text chunk
    TOOL_CALL,       // Complete tool invocation
    TOOL_CALL_DELTA, // Streaming tool arguments
    JSON,            // JSON schema output chunk
    DEBUG            // Development only
}
