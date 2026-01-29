package com.insuretech.pms.chat.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * OpenAI-compatible request for LLM workers (vLLM/GGUF)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkerRequest {
    private String model;
    private List<WorkerMessage> messages;
    private boolean stream;
    private Double temperature;

    @JsonProperty("max_tokens")
    private Integer maxTokens;

    @JsonProperty("top_p")
    private Double topP;

    private List<String> stop;
    private List<Map<String, Object>> tools;

    @JsonProperty("response_format")
    private Map<String, Object> responseFormat;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkerMessage {
        private String role;
        private String content;
        private String name;

        @JsonProperty("tool_call_id")
        private String toolCallId;

        @JsonProperty("tool_calls")
        private List<Map<String, Object>> toolCalls;
    }
}
