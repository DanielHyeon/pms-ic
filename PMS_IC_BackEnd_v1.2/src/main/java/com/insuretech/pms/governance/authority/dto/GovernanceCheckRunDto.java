package com.insuretech.pms.governance.authority.dto;

import com.insuretech.pms.governance.authority.entity.R2dbcGovernanceCheckRun;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * DTO representing a governance compliance check run and its findings.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GovernanceCheckRunDto {

    private String id;
    private String projectId;
    private OffsetDateTime checkedAt;
    private String checkedBy;
    private String summaryJson;
    private List<GovernanceFindingDto> findings;

    /**
     * Factory method to create a GovernanceCheckRunDto from an R2dbcGovernanceCheckRun entity.
     * The findings list is not populated here; it must be enriched separately.
     */
    public static GovernanceCheckRunDto from(R2dbcGovernanceCheckRun entity) {
        return GovernanceCheckRunDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .checkedAt(entity.getCheckedAt())
                .checkedBy(entity.getCheckedBy())
                .summaryJson(entity.getSummaryJson())
                .build();
    }
}
