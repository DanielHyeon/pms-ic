package com.insuretech.pms.chat.tool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Context for tool execution including user info and permissions
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolContext {
    private String userId;
    private String projectId;
    private String sessionId;
    private String userRole;
    private Integer accessLevel;
    private String traceId;
}
