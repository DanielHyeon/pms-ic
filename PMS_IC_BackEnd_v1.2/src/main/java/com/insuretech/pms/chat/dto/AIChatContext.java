package com.insuretech.pms.chat.dto;

import com.insuretech.pms.chat.entity.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Context object for AI chat service calls.
 * Consolidates parameters for the AI chat client to reduce method parameter count.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIChatContext {

    /**
     * User ID making the request
     */
    private String userId;

    /**
     * The user's message/query
     */
    private String message;

    /**
     * Recent conversation messages for context
     */
    private List<ChatMessage> recentMessages;

    /**
     * Project ID for scoped queries (optional)
     */
    private String projectId;

    /**
     * User's role for access control
     */
    private String userRole;

    /**
     * User's access level for permission checks
     */
    private Integer userAccessLevel;
}
