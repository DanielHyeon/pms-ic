package com.insuretech.pms.rfp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.rfp.reactive.entity.R2dbcExtractionRun;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ExtractionRunDto {

    private String id;
    private String rfpId;
    private String rfpVersionId;
    private String modelName;
    private String modelVersion;
    private String promptVersion;
    private String schemaVersion;
    private String generationParams;
    private String status;
    private Boolean isActive;
    private StatsDto stats;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private LocalDateTime createdAt;
    private String createdBy;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class StatsDto {
        private Integer totalCandidates;
        private Integer ambiguityCount;
        private BigDecimal avgConfidence;
        private String categoryBreakdown;
    }

    public static ExtractionRunDto from(R2dbcExtractionRun entity) {
        StatsDto stats = StatsDto.builder()
                .totalCandidates(entity.getTotalCandidates())
                .ambiguityCount(entity.getAmbiguityCount())
                .avgConfidence(entity.getAvgConfidence())
                .categoryBreakdown(entity.getCategoryBreakdown())
                .build();

        return ExtractionRunDto.builder()
                .id(entity.getId())
                .rfpId(entity.getRfpId())
                .rfpVersionId(entity.getRfpVersionId())
                .modelName(entity.getModelName())
                .modelVersion(entity.getModelVersion())
                .promptVersion(entity.getPromptVersion())
                .schemaVersion(entity.getSchemaVersion())
                .generationParams(entity.getGenerationParams())
                .status(entity.getStatus())
                .isActive(entity.getIsActive())
                .stats(stats)
                .errorMessage(entity.getErrorMessage())
                .startedAt(entity.getStartedAt())
                .finishedAt(entity.getFinishedAt())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }
}
