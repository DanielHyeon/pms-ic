package com.insuretech.pms.chat.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for non-streaming chat messages.
 * Contains validation constraints for all fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    /**
     * Session ID for continuing a conversation.
     * If null or empty, a new session will be created.
     * Must be a valid UUID format if provided.
     */
    @Pattern(regexp = "^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            message = "Session ID must be a valid UUID format")
    private String sessionId;

    /**
     * The user's message to send to the AI.
     * Required field with length constraints.
     */
    @NotBlank(message = "Message is required")
    @Size(min = 1, max = 10000, message = "Message must be between 1 and 10000 characters")
    private String message;

    /**
     * Optional conversation context (previous messages).
     */
    @Valid
    @Size(max = 50, message = "Context cannot exceed 50 messages")
    private List<MessageContext> context;

    /**
     * Project ID for filtering RAG results.
     * Must be a valid UUID format if provided.
     */
    @Pattern(regexp = "^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            message = "Project ID must be a valid UUID format")
    private String projectId;

    /**
     * User's role for RBAC (DEVELOPER, PM, etc.).
     */
    @Size(max = 50, message = "User role cannot exceed 50 characters")
    @Pattern(regexp = "^$|^[A-Z_]+$", message = "User role must be uppercase letters and underscores only")
    private String userRole;

    /**
     * Explicit access level for authorization (1-6).
     */
    @Min(value = 1, message = "Access level must be at least 1")
    @Max(value = 6, message = "Access level cannot exceed 6")
    private Integer userAccessLevel;

    /**
     * Nested DTO for message context entries.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageContext {
        @NotBlank(message = "Role is required for context message")
        @Pattern(regexp = "^(user|assistant|system)$", message = "Role must be 'user', 'assistant', or 'system'")
        private String role;

        @NotBlank(message = "Content is required for context message")
        @Size(max = 10000, message = "Context message content cannot exceed 10000 characters")
        private String content;
    }
}
