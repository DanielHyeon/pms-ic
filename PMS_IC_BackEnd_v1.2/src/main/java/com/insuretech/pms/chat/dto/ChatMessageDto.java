package com.insuretech.pms.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Chat message DTO for API communication.
 * Represents a single message in the conversation history.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {

    /**
     * The role of the message sender.
     * Valid values: "user", "assistant", "system", "tool"
     */
    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(user|assistant|system|tool)$",
            message = "Role must be 'user', 'assistant', 'system', or 'tool'")
    private String role;

    /**
     * The content of the message.
     */
    @Size(max = 50000, message = "Content cannot exceed 50000 characters")
    private String content;

    /**
     * Name of the tool (for tool messages).
     */
    @Size(max = 100, message = "Tool name cannot exceed 100 characters")
    private String name;

    /**
     * Tool call ID for tool response messages.
     */
    @JsonProperty("tool_call_id")
    @Size(max = 100, message = "Tool call ID cannot exceed 100 characters")
    private String toolCallId;

    /**
     * Tool calls made by the assistant.
     * Present when the assistant requests to use tools.
     */
    @JsonProperty("tool_calls")
    @Size(max = 10, message = "Cannot have more than 10 tool calls in a single message")
    private List<Map<String, Object>> toolCalls;

    /**
     * Creates a user message.
     */
    public static ChatMessageDto user(String content) {
        return ChatMessageDto.builder()
                .role("user")
                .content(content)
                .build();
    }

    /**
     * Creates an assistant message.
     */
    public static ChatMessageDto assistant(String content) {
        return ChatMessageDto.builder()
                .role("assistant")
                .content(content)
                .build();
    }

    /**
     * Creates a system message.
     */
    public static ChatMessageDto system(String content) {
        return ChatMessageDto.builder()
                .role("system")
                .content(content)
                .build();
    }

    /**
     * Creates a tool response message.
     */
    public static ChatMessageDto toolResponse(String toolCallId, String name, String content) {
        return ChatMessageDto.builder()
                .role("tool")
                .toolCallId(toolCallId)
                .name(name)
                .content(content)
                .build();
    }
}
