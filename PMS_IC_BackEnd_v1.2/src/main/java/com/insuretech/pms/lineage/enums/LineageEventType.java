package com.insuretech.pms.lineage.enums;

/**
 * Types of lineage events for requirement traceability.
 * These events drive Neo4j and OpenMetadata synchronization.
 */
public enum LineageEventType {

    // ===== RFP Events =====
    RFP_NODE_CREATED,
    RFP_REQUIREMENT_LINKED,
    CANDIDATES_CONFIRMED,

    // ===== Requirement Events =====
    REQUIREMENT_CREATED,
    REQUIREMENT_UPDATED,
    REQUIREMENT_DELETED,
    REQUIREMENT_STATUS_CHANGED,

    // ===== UserStory Events =====
    STORY_CREATED,
    STORY_UPDATED,
    STORY_DELETED,
    STORY_SPRINT_ASSIGNED,

    // ===== Task Events =====
    TASK_CREATED,
    TASK_UPDATED,
    TASK_DELETED,
    TASK_STATUS_CHANGED,

    // ===== Lineage Relationship Events =====
    REQUIREMENT_STORY_LINKED,
    REQUIREMENT_STORY_UNLINKED,
    STORY_TASK_LINKED,
    STORY_TASK_UNLINKED,
    REQUIREMENT_TASK_LINKED,
    REQUIREMENT_TASK_UNLINKED,

    // ===== Sprint Events =====
    SPRINT_CREATED,
    SPRINT_STARTED,
    SPRINT_COMPLETED;

    public String getAggregateType() {
        if (name().startsWith("RFP_") || name().startsWith("CANDIDATES_")) {
            return "RFP";
        } else if (name().startsWith("REQUIREMENT")) {
            return "REQUIREMENT";
        } else if (name().startsWith("STORY")) {
            return "USER_STORY";
        } else if (name().startsWith("TASK")) {
            return "TASK";
        } else if (name().startsWith("SPRINT")) {
            return "SPRINT";
        }
        return "UNKNOWN";
    }

    public boolean isLineageEvent() {
        return name().contains("LINKED") || name().contains("UNLINKED");
    }

    public boolean isCreationEvent() {
        return name().endsWith("_CREATED");
    }

    public boolean isDeletionEvent() {
        return name().endsWith("_DELETED");
    }
}
