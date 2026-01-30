package com.insuretech.pms.chat.dto;

import com.insuretech.pms.chat.validation.ValidEngine;
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
 * Request DTO for streaming chat API.
 * Supports SSE streaming with tool calling capabilities.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatStreamRequest {

    /**
     * Session ID for continuing a conversation.
     * If null or empty, a new session will be created.
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
     * LLM engine to use: "auto" | "gguf" | "vllm" | "ab".
     * Defaults to "auto" if not specified.
     */
    @ValidEngine
    @Builder.Default
    private String engine = "auto";

    /**
     * Previous messages for context (optional).
     */
    @Valid
    @Size(max = 50, message = "Context cannot exceed 50 messages")
    private List<ChatMessageDto> context;

    /**
     * Retrieved documents from RAG (optional).
     */
    @Size(max = 20, message = "Retrieved documents cannot exceed 20 entries")
    private List<@Size(max = 50000, message = "Each retrieved document cannot exceed 50000 characters") String> retrievedDocs;

    /**
     * Project ID for filtering RAG results.
     */
    @Pattern(regexp = "^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            message = "Project ID must be a valid UUID format")
    private String projectId;

    /**
     * User's role for RBAC filtering.
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
     * LLM generation parameters (temperature, topP, maxTokens, etc.).
     */
    @Valid
    @Builder.Default
    private GenerationParams generation = GenerationParams.defaults();

    /**
     * Enable tool calling for this request.
     */
    @Builder.Default
    private boolean enableTools = false;

    /**
     * Specific tools to enable (null = all registered tools).
     */
    @Size(max = 20, message = "Cannot specify more than 20 tools")
    private List<@Size(max = 100, message = "Tool name cannot exceed 100 characters") String> tools;

    /**
     * Creates a basic request with just message and engine.
     */
    public static ChatStreamRequest simple(String message) {
        return ChatStreamRequest.builder()
                .message(message)
                .engine("auto")
                .build();
    }

    /**
     * Creates a request with tool calling enabled.
     */
    public static ChatStreamRequest withTools(String message, List<String> tools) {
        return ChatStreamRequest.builder()
                .message(message)
                .engine("auto")
                .enableTools(true)
                .tools(tools)
                .build();
    }
}
