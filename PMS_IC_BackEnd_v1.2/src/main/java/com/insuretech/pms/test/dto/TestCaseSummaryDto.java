package com.insuretech.pms.test.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.test.reactive.entity.R2dbcTestCase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight test case DTO for list views.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestCaseSummaryDto {

    private String id;
    private String testCaseCode;
    private String title;
    private String priority;
    private String definitionStatus;
    private String lastOutcome;
    private String derivedStatus;
    private String suiteId;
    private String assigneeId;
    private Integer runCount;

    public static TestCaseSummaryDto from(R2dbcTestCase entity) {
        return TestCaseSummaryDto.builder()
                .id(entity.getId())
                .testCaseCode(entity.getTestCaseCode())
                .title(entity.getTitle())
                .priority(entity.getPriority())
                .definitionStatus(entity.getDefinitionStatus())
                .lastOutcome(entity.getLastOutcome())
                .derivedStatus(entity.getDerivedStatus())
                .suiteId(entity.getSuiteId())
                .assigneeId(entity.getAssigneeId())
                .runCount(entity.getRunCount())
                .build();
    }
}
