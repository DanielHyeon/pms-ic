package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcProjectMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberDto {
    private String id;
    private String projectId;
    private String userId;
    private String userName;
    private String userEmail;
    private String role;
    private String department;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectMemberDto from(R2dbcProjectMember member) {
        return ProjectMemberDto.builder()
                .id(member.getId())
                .projectId(member.getProjectId())
                .userId(member.getUserId())
                .userName(null) // User name must be populated separately via join
                .userEmail(null) // User email must be populated separately via join
                .role(member.getRole())
                .department(null) // Department must be populated separately via join
                .createdAt(member.getCreatedAt())
                .updatedAt(member.getUpdatedAt())
                .build();
    }

    public static ProjectMemberDto from(R2dbcProjectMember member, String userName, String userEmail, String department) {
        return ProjectMemberDto.builder()
                .id(member.getId())
                .projectId(member.getProjectId())
                .userId(member.getUserId())
                .userName(userName)
                .userEmail(userEmail)
                .role(member.getRole())
                .department(department)
                .createdAt(member.getCreatedAt())
                .updatedAt(member.getUpdatedAt())
                .build();
    }
}
