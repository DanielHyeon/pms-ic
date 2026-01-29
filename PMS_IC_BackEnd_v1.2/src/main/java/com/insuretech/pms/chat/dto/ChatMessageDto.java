package com.insuretech.pms.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Chat message DTO for API communication
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {
    private String role;    // "user" | "assistant" | "system" | "tool"
    private String content;
    private String name;    // For tool messages

    @JsonProperty("tool_call_id")
    private String toolCallId; // For tool response

    @JsonProperty("tool_calls")
    private List<Map<String, Object>> toolCalls; // For assistant messages with tool calls
}
