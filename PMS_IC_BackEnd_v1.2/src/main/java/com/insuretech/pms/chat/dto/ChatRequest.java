package com.insuretech.pms.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {
    private String sessionId;
    private String message;
    private List<MessageContext> context;

    // Access control fields for RAG filtering
    private String projectId;      // Filter RAG results by project
    private String userRole;       // User's role (DEVELOPER, PM, etc.)
    private Integer userAccessLevel; // Explicit access level (1-6)

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageContext {
        private String role;
        private String content;
    }
}