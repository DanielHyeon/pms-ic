package com.insuretech.pms.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for Critical Path calculation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CriticalPathResponse {

    private List<String> criticalPath;
    private Map<String, ItemFloatData> itemsWithFloat;
    private int projectDuration;
    private LocalDateTime calculatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemFloatData {
        private String name;
        private int duration;
        private int earlyStart;
        private int earlyFinish;
        private int lateStart;
        private int lateFinish;
        private int totalFloat;
        private int freeFloat;
        private boolean isCritical;
    }
}
