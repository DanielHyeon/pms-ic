package com.insuretech.pms.chat.ab;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Result of an A/B test comparison between two LLM engines
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ABTestResult {
    private String traceId;
    private String sessionId;
    private String userId;

    // Primary engine (shown to user)
    private String primaryEngine;
    private String primaryOutput;
    private long primaryTtftMs;
    private long primaryTotalMs;
    private int primaryTokens;

    // Shadow engine (collected for comparison)
    private String shadowEngine;
    private String shadowOutput;
    private long shadowTtftMs;
    private long shadowTotalMs;
    private int shadowTokens;

    // Input details
    private int inputLength;
    private String userMessage;

    // Timestamps
    private Instant createdAt;
    private Instant completedAt;

    // Status
    private ABStatus status;
    private String errorMessage;

    public enum ABStatus {
        IN_PROGRESS,
        COMPLETED,
        PRIMARY_FAILED,
        SHADOW_FAILED,
        BOTH_FAILED
    }

    public static ABTestResult create(String traceId, String sessionId, String userId,
                                       String primaryEngine, String shadowEngine) {
        return ABTestResult.builder()
                .traceId(traceId)
                .sessionId(sessionId)
                .userId(userId)
                .primaryEngine(primaryEngine)
                .shadowEngine(shadowEngine)
                .status(ABStatus.IN_PROGRESS)
                .createdAt(Instant.now())
                .build();
    }

    public void completePrimary(String output, long ttftMs, long totalMs, int tokens) {
        this.primaryOutput = output;
        this.primaryTtftMs = ttftMs;
        this.primaryTotalMs = totalMs;
        this.primaryTokens = tokens;
        updateStatus();
    }

    public void completeShadow(String output, long ttftMs, long totalMs, int tokens) {
        this.shadowOutput = output;
        this.shadowTtftMs = ttftMs;
        this.shadowTotalMs = totalMs;
        this.shadowTokens = tokens;
        updateStatus();
    }

    public void failPrimary(String error) {
        this.errorMessage = "Primary failed: " + error;
        this.status = ABStatus.PRIMARY_FAILED;
    }

    public void failShadow(String error) {
        if (this.status == ABStatus.PRIMARY_FAILED) {
            this.status = ABStatus.BOTH_FAILED;
        } else {
            this.status = ABStatus.SHADOW_FAILED;
        }
        this.errorMessage = (this.errorMessage != null ? this.errorMessage + "; " : "") + "Shadow failed: " + error;
    }

    private void updateStatus() {
        if (primaryOutput != null && shadowOutput != null) {
            this.status = ABStatus.COMPLETED;
            this.completedAt = Instant.now();
        }
    }

    public boolean isComplete() {
        return status == ABStatus.COMPLETED ||
               status == ABStatus.PRIMARY_FAILED ||
               status == ABStatus.SHADOW_FAILED ||
               status == ABStatus.BOTH_FAILED;
    }
}
