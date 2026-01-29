package com.insuretech.pms.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private String toolCallId; // For tool response
}
