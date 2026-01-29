package com.insuretech.pms.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for streaming chat API
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatStreamRequest {
    private String sessionId;           // Optional, creates new if null
    private String message;             // User message
    private String engine;              // "auto" | "gguf" | "vllm" | "ab"
    private List<ChatMessageDto> context;  // Previous messages (optional)
    private List<String> retrievedDocs; // RAG documents (optional)
    private String projectId;           // Project context
    private String userRole;            // User role for RBAC
    private Integer userAccessLevel;    // Access level

    @Builder.Default
    private GenerationParams generation = GenerationParams.defaults();
}
