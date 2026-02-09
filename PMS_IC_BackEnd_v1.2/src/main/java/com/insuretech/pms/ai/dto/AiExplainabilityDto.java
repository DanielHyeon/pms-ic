package com.insuretech.pms.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.util.List;

/**
 * Explainability metadata for transparency.
 * Matches frontend AiExplainability type.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiExplainabilityDto(
        String dataCollectedAt,
        String completeness,
        List<String> missingSignals,
        List<DataSourceDto> dataSources,
        String generationMethod,
        List<String> warnings,
        List<ChangeHistoryLinkDto> changeHistoryLinks
) {

    @Builder
    public record DataSourceDto(
            String source,
            List<String> tables,
            Integer recordCount,
            String lastSyncAt
    ) {}

    @Builder
    public record ChangeHistoryLinkDto(
            String label,
            String route
    ) {}
}
