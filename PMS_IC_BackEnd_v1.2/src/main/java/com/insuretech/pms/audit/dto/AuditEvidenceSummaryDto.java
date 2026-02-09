package com.insuretech.pms.audit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditEvidenceSummaryDto {
    private int totalEvidence;
    private int deliverableEvidence;
    private int testResultEvidence;
    private int requirementEvidence;
    private int approvedEvidence;
    private int pendingEvidence;
    private double evidenceCoveragePct;
    private int missingEvidenceCount;
    private int exportCount;
}
