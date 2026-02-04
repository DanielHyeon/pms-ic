package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Server-side status derivation rules.
 * Status classification lives in the backend to prevent client-side logic divergence.
 */
public class StatusDerivation {

    public static StatusResult derivePartStatus(long blocked, long total, long inProgress) {
        List<StatusReasonCode> reasons = new ArrayList<>();
        if (total == 0) {
            reasons.add(StatusReasonCode.NO_TASKS_ASSIGNED);
            return new StatusResult("normal", reasons);
        }
        double blockedRatio = (double) blocked / total;
        if (blocked >= 3) reasons.add(StatusReasonCode.THREE_OR_MORE_BLOCKED_TASKS);
        if (blockedRatio > 0.20) reasons.add(StatusReasonCode.BLOCKED_RATIO_OVER_20_PCT);
        if (blocked >= 1) reasons.add(StatusReasonCode.ONE_OR_MORE_BLOCKED_TASKS);
        if (blockedRatio > 0.10) reasons.add(StatusReasonCode.BLOCKED_RATIO_OVER_10_PCT);

        String status = !reasons.isEmpty() && reasons.stream().anyMatch(r ->
                r == StatusReasonCode.THREE_OR_MORE_BLOCKED_TASKS ||
                        r == StatusReasonCode.BLOCKED_RATIO_OVER_20_PCT) ? "danger"
                : !reasons.isEmpty() ? "warning" : "normal";
        return new StatusResult(status, reasons);
    }

    public static StatusResult derivePhaseStatus(int progress, LocalDate endDate, String phaseStatus) {
        List<StatusReasonCode> reasons = new ArrayList<>();
        if ("COMPLETED".equals(phaseStatus)) {
            reasons.add(StatusReasonCode.PHASE_COMPLETED);
            return new StatusResult("normal", reasons);
        }
        if (endDate != null && endDate.isBefore(LocalDate.now()) && progress < 100) {
            reasons.add(StatusReasonCode.OVERDUE_NOT_COMPLETED);
        }
        if (progress < 30) {
            reasons.add(StatusReasonCode.PROGRESS_BELOW_30_PCT);
        }
        String status = reasons.contains(StatusReasonCode.OVERDUE_NOT_COMPLETED) ? "danger"
                : reasons.contains(StatusReasonCode.PROGRESS_BELOW_30_PCT) ? "warning" : "normal";
        return new StatusResult(status, reasons);
    }

    @Data
    @AllArgsConstructor
    public static class StatusResult {
        private String status;
        private List<StatusReasonCode> reasons;
    }
}
