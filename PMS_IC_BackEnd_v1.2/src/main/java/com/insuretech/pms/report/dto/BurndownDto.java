package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BurndownDto {
    private String sprintId;
    private String sprintName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer totalPoints;
    private List<BurndownPoint> dataPoints;
    private Boolean isApproximate;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BurndownPoint {
        private LocalDate date;
        private Integer remainingPoints;
        private Integer idealPoints;
    }
}
