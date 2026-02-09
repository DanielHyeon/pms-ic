package com.insuretech.pms.test.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.test.reactive.entity.R2dbcTestCase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestCaseDto {

    private String id;
    private String projectId;
    private String suiteId;
    private String testCaseCode;
    private String title;
    private String description;
    private String preconditions;
    private String testType;
    private String priority;
    private String definitionStatus;
    private String lastOutcome;
    private String derivedStatus;
    private String assigneeId;
    private String phaseId;
    private Integer runCount;
    private LocalDateTime lastRunAt;
    private Integer estimatedDuration;
    private List<TestStepDto> steps;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    public static TestCaseDto from(R2dbcTestCase entity) {
        return TestCaseDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .suiteId(entity.getSuiteId())
                .testCaseCode(entity.getTestCaseCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .preconditions(entity.getPreconditions())
                .testType(entity.getTestType())
                .priority(entity.getPriority())
                .definitionStatus(entity.getDefinitionStatus())
                .lastOutcome(entity.getLastOutcome())
                .derivedStatus(entity.getDerivedStatus())
                .assigneeId(entity.getAssigneeId())
                .phaseId(entity.getPhaseId())
                .runCount(entity.getRunCount())
                .lastRunAt(entity.getLastRunAt())
                .estimatedDuration(entity.getEstimatedDuration())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
