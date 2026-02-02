package com.insuretech.pms.chat.dto.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Meta event - sent at stream start with metadata
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaEvent {
    private String traceId;
    private String engine;      // "vllm" | "gguf" | "auto"
    private String model;
    private String mode;        // "chat" | "completion"
    private Instant timestamp;
    private String sessionId;
}
