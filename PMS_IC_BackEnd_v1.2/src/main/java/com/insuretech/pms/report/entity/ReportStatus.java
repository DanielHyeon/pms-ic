package com.insuretech.pms.report.entity;

/**
 * Report status enumeration
 */
public enum ReportStatus {
    DRAFT,      // Initial state, can be edited
    PUBLISHED,  // Final state, visible to others
    ARCHIVED    // Historical, read-only
}
