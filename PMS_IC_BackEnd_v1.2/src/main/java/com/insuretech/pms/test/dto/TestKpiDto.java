package com.insuretech.pms.test.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestKpiDto {

    private long total;
    private long passed;
    private long failed;
    private long blocked;
    private long skipped;
    private long notRun;
    private double passRate;
    private double executionRate;
}
