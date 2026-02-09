package com.insuretech.pms.governance.organization.dto;

import com.insuretech.pms.governance.organization.entity.R2dbcOrgPart;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrgPartDto {

    private String id;
    private String projectId;
    private String name;
    private String partType;
    private String customTypeName;
    private String status;
    private String leaderUserId;
    private String leaderUserName;
    private List<CoLeaderDto> coLeaders;
    private long activeMemberCount;
    private OffsetDateTime createdAt;
    private String createdBy;
    private OffsetDateTime closedAt;
    private String closedBy;
    private boolean hasLeaderWarning;

    public static OrgPartDto from(R2dbcOrgPart entity) {
        return OrgPartDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .name(entity.getName())
                .partType(entity.getPartType())
                .customTypeName(entity.getCustomTypeName())
                .status(entity.getStatus())
                .leaderUserId(entity.getLeaderUserId())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .closedAt(entity.getClosedAt())
                .closedBy(entity.getClosedBy())
                .build();
    }
}
