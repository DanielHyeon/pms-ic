package com.insuretech.pms.test.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.test.reactive.entity.R2dbcTestRunStepResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestRunStepResultDto {

    private String id;
    private String testRunId;
    private String testStepId;
    private Integer stepNumber;
    private String actualResult;
    private String status;
    private String screenshotPath;
    private String notes;

    public static TestRunStepResultDto from(R2dbcTestRunStepResult entity) {
        return TestRunStepResultDto.builder()
                .id(entity.getId())
                .testRunId(entity.getTestRunId())
                .testStepId(entity.getTestStepId())
                .stepNumber(entity.getStepNumber())
                .actualResult(entity.getActualResult())
                .status(entity.getStatus())
                .screenshotPath(entity.getScreenshotPath())
                .notes(entity.getNotes())
                .build();
    }
}
