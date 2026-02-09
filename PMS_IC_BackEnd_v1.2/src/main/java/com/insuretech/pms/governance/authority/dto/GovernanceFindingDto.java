package com.insuretech.pms.governance.authority.dto;

import com.insuretech.pms.governance.authority.entity.R2dbcGovernanceFinding;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * DTO representing a single finding from a governance compliance check.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GovernanceFindingDto {

    private String id;
    private String runId;
    private String projectId;
    private String findingType;
    private String severity;
    private String userId;
    private String userName;
    private String delegationId;
    private String message;
    private String detailsJson;
    private OffsetDateTime createdAt;

    /**
     * Factory method to create a GovernanceFindingDto from an R2dbcGovernanceFinding entity.
     * The userName field is not populated here; it must be enriched separately.
     */
    public static GovernanceFindingDto from(R2dbcGovernanceFinding entity) {
        return GovernanceFindingDto.builder()
                .id(entity.getId())
                .runId(entity.getRunId())
                .projectId(entity.getProjectId())
                .findingType(entity.getFindingType())
                .severity(entity.getSeverity())
                .userId(entity.getUserId())
                .delegationId(entity.getDelegationId())
                .message(entity.getMessage())
                .detailsJson(entity.getDetailsJson())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
