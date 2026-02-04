package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Generic response envelope for dashboard sections.
 * Every dashboard API response must follow this contract.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSection<T> {
    private T data;
    private DashboardMeta meta;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardMeta {
        private LocalDateTime asOf;
        private String scope;
        private List<String> sources;
        private List<String> queryIds;
        private Completeness completeness;
        @Builder.Default
        private List<DashboardWarning> warnings = new ArrayList<>();
        private Long computeMs;
        @Builder.Default
        private Boolean usedFallback = false;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardWarning {
        private String code;
        private String message;
    }

    public enum Completeness {
        COMPLETE,
        PARTIAL,
        NO_DATA
    }
}
