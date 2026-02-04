package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SprintVelocityDto {
    private List<SprintMetric> sprints;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SprintMetric {
        private String sprintId;
        private String sprintName;
        private String status;
        private Integer plannedPoints;
        private Integer completedPoints;
        private Double velocity;
        private String velocitySource;
    }
}
