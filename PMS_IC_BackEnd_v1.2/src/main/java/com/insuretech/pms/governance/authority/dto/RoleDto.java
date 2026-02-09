package com.insuretech.pms.governance.authority.dto;

import com.insuretech.pms.governance.authority.entity.R2dbcRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO representing a governance role with its associated capability IDs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleDto {

    private String id;
    private String code;
    private String name;
    private String description;
    private boolean isProjectScoped;
    private List<String> capabilityIds;

    /**
     * Factory method to create a RoleDto from an R2dbcRole entity.
     * Capability IDs are not populated here; they must be enriched separately
     * via the role_capabilities mapping table.
     */
    public static RoleDto from(R2dbcRole entity) {
        return RoleDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .isProjectScoped(entity.isProjectScoped())
                .build();
    }
}
