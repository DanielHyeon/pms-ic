package com.insuretech.pms.governance.accountability.dto;

import com.insuretech.pms.governance.accountability.entity.R2dbcAccountabilityChangeLog;
import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeLogEntryDto {

    private String id;
    private String projectId;
    private String changeType;
    private String previousUserId;
    private String previousUserName;
    private String newUserId;
    private String newUserName;
    private String changedBy;
    private String changedByName;
    private String changeReason;
    private OffsetDateTime changedAt;

    public static ChangeLogEntryDto from(R2dbcAccountabilityChangeLog entity) {
        return ChangeLogEntryDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .changeType(entity.getChangeType())
                .previousUserId(entity.getPreviousUserId())
                .newUserId(entity.getNewUserId())
                .changedBy(entity.getChangedBy())
                .changeReason(entity.getChangeReason())
                .changedAt(entity.getChangedAt())
                .build();
    }
}
