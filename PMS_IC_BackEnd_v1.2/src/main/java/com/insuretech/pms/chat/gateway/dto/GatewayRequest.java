package com.insuretech.pms.chat.gateway.dto;

import com.insuretech.pms.chat.dto.ChatMessageDto;
import com.insuretech.pms.chat.dto.GenerationParams;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for LLM Gateway
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GatewayRequest {
    private String traceId;
    private String engine;              // "auto" | "gguf" | "vllm" | "ab"
    private boolean stream;
    private List<ChatMessageDto> messages;
    private List<ToolDefinition> tools;
    private ResponseFormat responseFormat;
    private GenerationParams generation;
    private SafetyContext safety;
    private ABConfig ab;

    public boolean hasTools() {
        return tools != null && !tools.isEmpty();
    }

    public boolean hasResponseFormat() {
        return responseFormat != null;
    }

    public int estimateContextLength() {
        if (messages == null) return 0;
        return messages.stream()
                .mapToInt(m -> m.getContent() != null ? m.getContent().length() : 0)
                .sum();
    }
}
