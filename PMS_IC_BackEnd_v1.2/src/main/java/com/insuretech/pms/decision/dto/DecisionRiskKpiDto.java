package com.insuretech.pms.decision.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DecisionRiskKpiDto {
    private long totalDecisions;
    private long pendingDecisions;
    private long totalRisks;
    private long criticalRisks;
    private Double avgDecisionTimeHours;
    private long escalationCount;
}
