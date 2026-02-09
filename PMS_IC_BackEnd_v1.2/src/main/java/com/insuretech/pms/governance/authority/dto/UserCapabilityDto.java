package com.insuretech.pms.governance.authority.dto;

import com.insuretech.pms.governance.authority.entity.R2dbcUserCapability;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * DTO representing a directly-granted capability for a user within a project.
 * Name fields (userName, capabilityCode, capabilityName, grantedByName) are enriched after construction.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCapabilityDto {

    private String id;
    private String projectId;
    private String userId;
    private String userName;
    private String capabilityId;
    private String capabilityCode;
    private String capabilityName;
    private String grantedBy;
    private String grantedByName;
    private OffsetDateTime grantedAt;
    private String reason;

    /**
     * Factory method to create a UserCapabilityDto from an R2dbcUserCapability entity.
     * Name fields (userName, capabilityCode, capabilityName, grantedByName) are not
     * populated here; they must be enriched separately.
     */
    public static UserCapabilityDto from(R2dbcUserCapability entity) {
        return UserCapabilityDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .userId(entity.getUserId())
                .capabilityId(entity.getCapabilityId())
                .grantedBy(entity.getGrantedBy())
                .grantedAt(entity.getGrantedAt())
                .reason(entity.getReason())
                .build();
    }
}
