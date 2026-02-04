package com.insuretech.pms.report.dto;

/**
 * Closed enum for typed status reason codes.
 * Prevents typo-driven bugs and enables frontend i18n mapping.
 */
public enum StatusReasonCode {
    // Part-level reasons
    BLOCKED_RATIO_OVER_20_PCT,
    BLOCKED_RATIO_OVER_10_PCT,
    THREE_OR_MORE_BLOCKED_TASKS,
    ONE_OR_MORE_BLOCKED_TASKS,

    // Phase-level reasons
    OVERDUE_NOT_COMPLETED,
    PROGRESS_BELOW_30_PCT,
    PHASE_COMPLETED,

    // Sprint-level reasons
    VELOCITY_DECLINING,
    COMPLETION_RATE_BELOW_50_PCT,

    // General
    NO_TASKS_ASSIGNED,
}
