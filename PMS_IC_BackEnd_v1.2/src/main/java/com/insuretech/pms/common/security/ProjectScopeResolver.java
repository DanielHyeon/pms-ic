package com.insuretech.pms.common.security;

import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Resolves JWT projectRoles claims into project-scoped capability/scope maps.
 * Backward-compatible: returns empty map for tokens without projectRoles.
 */
@Component
public class ProjectScopeResolver {

    /**
     * Parse JWT projectRoles claim into a Map keyed by projectId.
     * Each entry contains the user's role, capabilities, and allowed part IDs.
     */
    @SuppressWarnings("unchecked")
    public Map<String, ProjectScope> resolveScopes(List<Map<String, Object>> projectRolesClaim) {
        if (projectRolesClaim == null || projectRolesClaim.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, ProjectScope> scopeMap = new HashMap<>();
        for (Map<String, Object> entry : projectRolesClaim) {
            String projectId = (String) entry.get("projectId");
            String role = (String) entry.get("role");
            List<String> capabilities = (List<String>) entry.getOrDefault("capabilities", Collections.emptyList());
            List<String> allowedPartIds = (List<String>) entry.getOrDefault("allowedPartIds", Collections.emptyList());

            scopeMap.put(projectId, ProjectScope.builder()
                    .projectId(projectId)
                    .role(role)
                    .capabilities(new HashSet<>(capabilities))
                    .allowedPartIds(new HashSet<>(allowedPartIds))
                    .build());
        }
        return scopeMap;
    }

    /**
     * Get the scope for a specific project. Returns empty Optional if not found.
     */
    public Optional<ProjectScope> getScopeForProject(List<Map<String, Object>> projectRolesClaim, String projectId) {
        return Optional.ofNullable(resolveScopes(projectRolesClaim).get(projectId));
    }
}
