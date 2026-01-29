package com.insuretech.pms.auth.dto;

import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.project.reactive.entity.R2dbcProjectMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private static final Set<String> SYSTEM_WIDE_ROLES = Set.of("ADMIN", "AUDITOR");

    private String token;
    private String refreshToken;
    private UserInfo user;
    private List<ProjectRoleInfo> projectRoles;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private String id;
        private String email;
        private String name;
        private String role;
        private String systemRole;
        private String department;

        public static UserInfo from(R2dbcUser user) {
            String systemRole = null;
            String role = null;

            if (user.getRole() != null) {
                String roleName = user.getRole();
                role = roleName.toLowerCase();

                // System-wide roles: ADMIN and AUDITOR
                if (SYSTEM_WIDE_ROLES.contains(roleName)) {
                    systemRole = roleName.toLowerCase();
                }
            }

            return UserInfo.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .name(user.getName())
                    .role(role)
                    .systemRole(systemRole)
                    .department(user.getDepartment())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectRoleInfo {
        private String projectId;
        private String projectName;
        private String role;

        public static ProjectRoleInfo from(R2dbcProjectMember member) {
            return ProjectRoleInfo.builder()
                    .projectId(member.getProjectId())
                    .projectName(null) // Project name must be populated separately via join
                    .role(member.getRole().toLowerCase())
                    .build();
        }

        public static ProjectRoleInfo from(R2dbcProjectMember member, String projectName) {
            return ProjectRoleInfo.builder()
                    .projectId(member.getProjectId())
                    .projectName(projectName)
                    .role(member.getRole().toLowerCase())
                    .build();
        }
    }
}
