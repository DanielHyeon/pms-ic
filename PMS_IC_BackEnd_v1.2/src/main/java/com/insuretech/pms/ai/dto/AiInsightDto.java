package com.insuretech.pms.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.util.List;

/**
 * Individual insight detected by rule engine or LLM.
 * Matches frontend AiInsight type.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiInsightDto(
        String id,
        String type,
        String severity,
        String title,
        String description,
        double confidence,
        EvidenceDto evidence,
        List<String> actionRefs
) {

    @Builder
    public record EvidenceDto(
            String asOf,
            List<String> metrics,
            List<String> entities,
            String dataSource,
            String query
    ) {}
}
