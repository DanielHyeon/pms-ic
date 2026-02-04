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
public class PartStatsDto {
    private List<PartLeaderMetric> parts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartLeaderMetric {
        private String partId;
        private String partName;
        private String leaderId;
        private String leaderName;
        private Long totalTasks;
        private Long completedTasks;
        private Long inProgressTasks;
        private Long blockedTasks;
        private String status;
        private List<StatusReasonCode> statusReasons;
    }
}
