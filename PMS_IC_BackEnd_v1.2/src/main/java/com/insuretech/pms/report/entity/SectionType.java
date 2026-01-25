package com.insuretech.pms.report.entity;

/**
 * Template section type enumeration
 */
public enum SectionType {
    AI_GENERATED,   // LLM-generated content
    DATA_TABLE,     // Data displayed as table
    DATA_LIST,      // Data displayed as list
    MANUAL_INPUT,   // User input section
    METRIC_CHART    // Chart/graph visualization
}
