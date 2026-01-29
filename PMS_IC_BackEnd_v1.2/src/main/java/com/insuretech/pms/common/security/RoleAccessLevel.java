package com.insuretech.pms.common.security;

import com.insuretech.pms.auth.reactive.entity.R2dbcUser.UserRole;
import com.insuretech.pms.project.reactive.entity.R2dbcProjectMember.ProjectRole;

import java.util.Map;

/**
 * Role-based access level utility for RAG document access control.
 * Higher level = more access privileges.
 */
public final class RoleAccessLevel {

    private RoleAccessLevel() {
        // Utility class
    }

    private static final Map<ProjectRole, Integer> PROJECT_ROLE_LEVELS = Map.of(
            ProjectRole.SPONSOR, 5,
            ProjectRole.PMO_HEAD, 4,
            ProjectRole.PM, 3,
            ProjectRole.BUSINESS_ANALYST, 2,
            ProjectRole.QA, 2,
            ProjectRole.DEVELOPER, 1,
            ProjectRole.MEMBER, 1
    );

    private static final Map<UserRole, Integer> USER_ROLE_LEVELS = Map.of(
            UserRole.ADMIN, 6,
            UserRole.SPONSOR, 5,
            UserRole.PMO_HEAD, 4,
            UserRole.PM, 3,
            UserRole.BUSINESS_ANALYST, 2,
            UserRole.QA, 2,
            UserRole.DEVELOPER, 1,
            UserRole.AUDITOR, 0
    );

    public static int getLevel(ProjectRole role) {
        return PROJECT_ROLE_LEVELS.getOrDefault(role, 1);
    }

    public static int getLevel(UserRole role) {
        return USER_ROLE_LEVELS.getOrDefault(role, 1);
    }

    public static int getLevelByName(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return 1;
        }
        try {
            return getLevel(ProjectRole.valueOf(roleName.toUpperCase()));
        } catch (IllegalArgumentException e) {
            try {
                return getLevel(UserRole.valueOf(roleName.toUpperCase()));
            } catch (IllegalArgumentException e2) {
                return 1;
            }
        }
    }

    /**
     * Check if accessor can access document uploaded by uploader.
     * Accessor can only access documents uploaded by same or lower level roles.
     */
    public static boolean canAccess(int accessorLevel, int documentAccessLevel) {
        return accessorLevel >= documentAccessLevel;
    }

    public static boolean canAccess(ProjectRole accessorRole, ProjectRole uploaderRole) {
        return canAccess(getLevel(accessorRole), getLevel(uploaderRole));
    }
}
