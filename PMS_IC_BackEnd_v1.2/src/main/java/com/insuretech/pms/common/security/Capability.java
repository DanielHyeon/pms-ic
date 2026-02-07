package com.insuretech.pms.common.security;

/**
 * Defines all capability constants for role-based access control.
 * Capabilities are mapped to project roles via project_role_permissions.
 */
public final class Capability {
    private Capability() {}

    public static final String VIEW_BACKLOG = "VIEW_BACKLOG";
    public static final String EDIT_BACKLOG_ITEM = "EDIT_BACKLOG_ITEM";
    public static final String APPROVE_BACKLOG_ITEM = "APPROVE_BACKLOG_ITEM";
    public static final String VIEW_STORY = "VIEW_STORY";
    public static final String EDIT_STORY = "EDIT_STORY";
    public static final String MANAGE_SPRINT = "MANAGE_SPRINT";
    public static final String ASSIGN_TASK = "ASSIGN_TASK";
    public static final String VIEW_PART_WORKLOAD = "VIEW_PART_WORKLOAD";
    public static final String VIEW_KPI = "VIEW_KPI";
    public static final String VIEW_AUDIT_LOG = "VIEW_AUDIT_LOG";
    public static final String EXPORT_REPORT = "EXPORT_REPORT";
    public static final String VIEW_DATA_QUALITY = "VIEW_DATA_QUALITY";

    /**
     * Role-to-capability mapping.
     * In production, this comes from project_role_permissions table.
     * This serves as the default/fallback mapping.
     */
    public static java.util.Set<String> getDefaultCapabilities(String role) {
        return switch (role) {
            case "SPONSOR", "PO" -> java.util.Set.of(
                VIEW_BACKLOG, EDIT_BACKLOG_ITEM, APPROVE_BACKLOG_ITEM,
                VIEW_STORY, VIEW_PART_WORKLOAD, VIEW_KPI, EXPORT_REPORT
            );
            case "PM" -> java.util.Set.of(
                VIEW_BACKLOG, VIEW_STORY, EDIT_STORY,
                MANAGE_SPRINT, ASSIGN_TASK, VIEW_PART_WORKLOAD
            );
            case "PMO_HEAD" -> java.util.Set.of(
                VIEW_BACKLOG, VIEW_STORY, VIEW_PART_WORKLOAD,
                VIEW_KPI, VIEW_AUDIT_LOG, EXPORT_REPORT, VIEW_DATA_QUALITY
            );
            case "DEVELOPER", "QA", "BUSINESS_ANALYST" -> java.util.Set.of(
                VIEW_BACKLOG, VIEW_STORY, VIEW_PART_WORKLOAD
            );
            case "MEMBER" -> java.util.Set.of(VIEW_BACKLOG, VIEW_STORY);
            default -> java.util.Set.of();
        };
    }
}
