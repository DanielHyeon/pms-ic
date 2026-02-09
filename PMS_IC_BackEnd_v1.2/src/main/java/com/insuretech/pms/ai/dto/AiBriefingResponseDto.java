package com.insuretech.pms.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.util.List;

/**
 * Top-level AI briefing response matching frontend AiBriefingResponse type.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiBriefingResponseDto(
        ContextDto context,
        SummaryDto summary,
        List<AiInsightDto> insights,
        List<AiRecommendedActionDto> recommendedActions,
        AiExplainabilityDto explainability
) {

    @Builder
    public record ContextDto(
            String projectId,
            String role,
            String asOf,
            String scope,
            String completeness,
            List<String> missingSignals
    ) {}

    @Builder
    public record SummaryDto(
            String headline,
            List<String> signals,
            String healthStatus,
            double confidence,
            String body
    ) {}
}
