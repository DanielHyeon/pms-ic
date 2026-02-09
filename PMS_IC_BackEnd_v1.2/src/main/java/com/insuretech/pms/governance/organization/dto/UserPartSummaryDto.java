package com.insuretech.pms.governance.organization.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPartSummaryDto {

    private String userId;
    private String userName;
    private List<UserMembershipDto> memberships;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserMembershipDto {
        private String partId;
        private String partName;
        private String partType;
        private String membershipType;
        private java.time.OffsetDateTime joinedAt;
    }
}
