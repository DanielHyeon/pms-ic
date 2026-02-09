package com.insuretech.pms.test.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.test.reactive.entity.R2dbcTestStep;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestStepDto {

    private String id;
    private String testCaseId;
    private Integer stepNumber;
    private String action;
    private String expectedResult;
    private String testData;

    public static TestStepDto from(R2dbcTestStep entity) {
        return TestStepDto.builder()
                .id(entity.getId())
                .testCaseId(entity.getTestCaseId())
                .stepNumber(entity.getStepNumber())
                .action(entity.getAction())
                .expectedResult(entity.getExpectedResult())
                .testData(entity.getTestData())
                .build();
    }
}
