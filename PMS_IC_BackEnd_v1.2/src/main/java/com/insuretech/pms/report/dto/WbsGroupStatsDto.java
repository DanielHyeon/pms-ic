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
public class WbsGroupStatsDto {
    private List<WbsGroupMetric> groups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WbsGroupMetric {
        private String groupId;
        private String groupName;
        private String trackType;
        private Integer progress;
        private String assigneeName;
        private String status;
        private List<StatusReasonCode> statusReasons;
    }
}
