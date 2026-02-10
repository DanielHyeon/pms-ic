package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;

import java.util.List;
import java.util.Map;

/**
 * RFP status state machine per design spec 24 v2.2 section 4.
 * Enforces allowed transitions and prevents invalid state changes.
 */
public final class RfpStateMachine {

    private RfpStateMachine() {}

    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.ofEntries(
            Map.entry("EMPTY", List.of("ORIGIN_DEFINED")),
            Map.entry("ORIGIN_DEFINED", List.of("UPLOADED")),
            Map.entry("UPLOADED", List.of("PARSING", "FAILED")),
            Map.entry("PARSING", List.of("PARSED", "FAILED")),
            Map.entry("PARSED", List.of("EXTRACTING", "FAILED")),
            Map.entry("EXTRACTING", List.of("EXTRACTED", "FAILED")),
            Map.entry("EXTRACTED", List.of("REVIEWING")),
            Map.entry("REVIEWING", List.of("CONFIRMED", "ON_HOLD")),
            Map.entry("CONFIRMED", List.of("NEEDS_REANALYSIS", "ON_HOLD")),
            Map.entry("NEEDS_REANALYSIS", List.of("PARSING")),
            Map.entry("ON_HOLD", List.of("REVIEWING", "CONFIRMED", "EXTRACTED")),
            Map.entry("FAILED", List.of("UPLOADED", "PARSING")),
            // Legacy backward-compat transitions
            Map.entry("DRAFT", List.of("SUBMITTED", "UPLOADED", "ORIGIN_DEFINED")),
            Map.entry("SUBMITTED", List.of("UNDER_REVIEW", "UPLOADED")),
            Map.entry("UNDER_REVIEW", List.of("APPROVED", "REJECTED")),
            Map.entry("APPROVED", List.of("CONFIRMED")),
            Map.entry("REJECTED", List.of("DRAFT"))
    );

    /**
     * Validate and return the new status if transition is allowed.
     * @throws CustomException if the transition is not permitted.
     */
    public static String validateTransition(String currentStatus, String newStatus) {
        List<String> allowed = ALLOWED_TRANSITIONS.get(currentStatus);
        if (allowed == null || !allowed.contains(newStatus)) {
            throw CustomException.badRequest(
                    String.format("Invalid status transition: %s -> %s. Allowed: %s",
                            currentStatus, newStatus,
                            allowed != null ? allowed : "none"));
        }
        return newStatus;
    }

    /**
     * Check if transition is valid without throwing.
     */
    public static boolean isTransitionAllowed(String currentStatus, String newStatus) {
        List<String> allowed = ALLOWED_TRANSITIONS.get(currentStatus);
        return allowed != null && allowed.contains(newStatus);
    }

    /**
     * Get allowed next statuses for a given current status.
     */
    public static List<String> getAllowedTransitions(String currentStatus) {
        return ALLOWED_TRANSITIONS.getOrDefault(currentStatus, List.of());
    }
}
