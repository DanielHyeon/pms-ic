package com.insuretech.pms.test.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.test.reactive.entity.R2dbcTestRun;
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
public class TestRunDto {

    private String id;
    private String testCaseId;
    private String projectId;
    private Integer runNumber;
    private String mode;
    private String result;
    private String executorId;
    private String environment;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Integer durationSeconds;
    private String notes;
    private String defectIssueId;
    private String defectCreateStatus;
    private List<TestRunStepResultDto> stepResults;
    private LocalDateTime createdAt;

    public static TestRunDto from(R2dbcTestRun entity) {
        return TestRunDto.builder()
                .id(entity.getId())
                .testCaseId(entity.getTestCaseId())
                .projectId(entity.getProjectId())
                .runNumber(entity.getRunNumber())
                .mode(entity.getMode())
                .result(entity.getResult())
                .executorId(entity.getExecutorId())
                .environment(entity.getEnvironment())
                .startedAt(entity.getStartedAt())
                .finishedAt(entity.getFinishedAt())
                .durationSeconds(entity.getDurationSeconds())
                .notes(entity.getNotes())
                .defectIssueId(entity.getDefectIssueId())
                .defectCreateStatus(entity.getDefectCreateStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
