package com.insuretech.pms.governance.accountability.dto;

import com.insuretech.pms.governance.accountability.entity.R2dbcProjectAccountability;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountabilityDto {

    private String projectId;
    private String primaryPmUserId;
    private String primaryPmName;
    private String coPmUserId;
    private String coPmName;
    private String sponsorUserId;
    private String sponsorName;
    private OffsetDateTime updatedAt;
    private String updatedBy;
    private List<ChangeLogEntryDto> recentChanges;

    public static AccountabilityDto from(R2dbcProjectAccountability entity) {
        return AccountabilityDto.builder()
                .projectId(entity.getProjectId())
                .primaryPmUserId(entity.getPrimaryPmUserId())
                .coPmUserId(entity.getCoPmUserId())
                .sponsorUserId(entity.getSponsorUserId())
                .updatedAt(entity.getUpdatedAt())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
