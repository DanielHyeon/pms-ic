package com.insuretech.pms.governance.organization.dto;

import com.insuretech.pms.governance.organization.entity.R2dbcPartMembership;
import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberDto {

    private String membershipId;
    private String userId;
    private String userName;
    private String membershipType;
    private OffsetDateTime joinedAt;

    public static MemberDto from(R2dbcPartMembership entity) {
        return MemberDto.builder()
                .membershipId(entity.getId())
                .userId(entity.getUserId())
                .membershipType(entity.getMembershipType())
                .joinedAt(entity.getJoinedAt())
                .build();
    }
}
