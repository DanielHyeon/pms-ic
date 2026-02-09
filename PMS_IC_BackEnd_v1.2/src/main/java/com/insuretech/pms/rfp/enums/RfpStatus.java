package com.insuretech.pms.rfp.enums;

/**
 * RFP status state machine per design spec 24 v2.2 section 4.
 * Legacy statuses (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED)
 * are retained for backward compatibility.
 */
public enum RfpStatus {
    // New state machine (section 4.1)
    EMPTY,
    ORIGIN_DEFINED,
    UPLOADED,
    PARSING,
    PARSED,
    EXTRACTING,
    EXTRACTED,
    REVIEWING,
    CONFIRMED,
    NEEDS_REANALYSIS,
    ON_HOLD,
    FAILED,

    // Legacy statuses (backward compat)
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    APPROVED,
    REJECTED
}
