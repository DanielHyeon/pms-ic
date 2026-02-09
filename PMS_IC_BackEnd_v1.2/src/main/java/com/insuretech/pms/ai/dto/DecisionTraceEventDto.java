package com.insuretech.pms.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * Input DTO for logging decision trace events.
 * Matches frontend DecisionTraceEvent type.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DecisionTraceEventDto(
        @NotBlank String projectId,
        @NotBlank String eventType,
        @NotBlank String briefingId,
        String insightId,
        String insightType,
        String severity,
        Double confidence,
        String actionId,
        String actionResult,
        String generationMethod,
        String completeness
) {}
