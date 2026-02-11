package com.insuretech.pms.governance.authority.dto;

import com.insuretech.pms.governance.authority.entity.R2dbcUserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * DTO representing a user-to-role assignment within a project.
 * Name fields (userName, roleName, grantedByName) are enriched after construction.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleDto {

    private String id;
    private String projectId;
    private String userId;
    private String userName;
    private String roleId;
    private String roleName;
    private String grantedBy;
    private String grantedByName;
    private OffsetDateTime grantedAt;
    private String reason;

    /** 역할 부여 시 SoD 사전 검증에서 발견된 경고 목록 */
    private List<SodWarningDto> sodWarnings;

    /**
     * Factory method to create a UserRoleDto from an R2dbcUserRole entity.
     * Name fields (userName, roleName, grantedByName) are not populated here;
     * they must be enriched separately via user/role lookups.
     */
    public static UserRoleDto from(R2dbcUserRole entity) {
        return UserRoleDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .userId(entity.getUserId())
                .roleId(entity.getRoleId())
                .grantedBy(entity.getGrantedBy())
                .grantedAt(entity.getGrantedAt())
                .reason(entity.getReason())
                .build();
    }
}
