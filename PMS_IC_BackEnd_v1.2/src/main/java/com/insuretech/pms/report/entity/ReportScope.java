package com.insuretech.pms.report.entity;

/**
 * Report scope enumeration - defines the data boundary for reports
 */
public enum ReportScope {
    PROJECT,    // Entire project
    PHASE,      // Specific phase
    TEAM,       // Team-level
    INDIVIDUAL  // Individual user
}
