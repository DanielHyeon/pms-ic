package com.insuretech.pms.governance.organization.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrgPartDetailDto {

    private String id;
    private String projectId;
    private String name;
    private String partType;
    private String customTypeName;
    private String status;
    private String leaderUserId;
    private String leaderUserName;
    private List<CoLeaderDto> coLeaders;
    private List<MemberDto> members;
    private long activeMemberCount;
    private OffsetDateTime createdAt;
    private String createdBy;
    private OffsetDateTime closedAt;
    private String closedBy;
    private boolean hasLeaderWarning;
}
