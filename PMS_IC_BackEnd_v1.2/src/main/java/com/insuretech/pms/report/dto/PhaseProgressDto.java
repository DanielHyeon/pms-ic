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
public class PhaseProgressDto {
    private List<PhaseMetric> phases;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PhaseMetric {
        private String phaseId;
        private String phaseName;
        private Integer orderNum;
        private String trackType;
        private Integer reportedProgress;
        private Integer derivedProgress;
        private Integer plannedProgress;
        private String status;
        private String derivedStatus;
        private List<StatusReasonCode> statusReasons;
        private String gateStatus;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}
