package com.insuretech.pms.common.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * Represents a user's capabilities and scope within a specific project.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectScope {
    private String projectId;
    private String role;
    private Set<String> capabilities;
    private Set<String> allowedPartIds;
}
