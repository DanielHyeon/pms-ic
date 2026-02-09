package com.insuretech.pms.rfp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ExtractionResultDto {

    private ExtractionRunDto run;
    private List<RequirementCandidateDto> candidates;
    private SummaryDto summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SummaryDto {
        private long totalCandidates;
        private long proposedCount;
        private long acceptedCount;
        private long rejectedCount;
        private long editedCount;
    }
}
