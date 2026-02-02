package com.insuretech.pms.chat.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Safety context for access control
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SafetyContext {
    private String userId;
    private String sessionId;
    private String projectId;
    private Integer userAccessLevel;
    private String userRole;
}
