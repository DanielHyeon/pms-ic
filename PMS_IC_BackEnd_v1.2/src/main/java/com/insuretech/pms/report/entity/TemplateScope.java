package com.insuretech.pms.report.entity;

/**
 * Template scope enumeration - defines template visibility/ownership
 */
public enum TemplateScope {
    SYSTEM,       // Built-in system templates
    ORGANIZATION, // Organization-level templates
    PERSONAL      // User's personal templates
}
