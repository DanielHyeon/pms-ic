package com.insuretech.pms.decision.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskMatrixDto {
    private List<Cell> cells;
    private long totalRisks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Cell {
        private int impact;
        private int probability;
        private long count;
        private String severity;
    }
}
