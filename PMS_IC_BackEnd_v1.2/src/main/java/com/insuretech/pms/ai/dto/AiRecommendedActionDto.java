package com.insuretech.pms.ai.dto;

import lombok.Builder;

import java.util.List;

/**
 * Recommended action derived from insights.
 * Matches frontend AiRecommendedAction type.
 */
@Builder
public record AiRecommendedActionDto(
        String actionId,
        String label,
        String description,
        String requiredCapability,
        String targetRoute,
        int priority,
        List<String> sourceInsightIds
) {}
