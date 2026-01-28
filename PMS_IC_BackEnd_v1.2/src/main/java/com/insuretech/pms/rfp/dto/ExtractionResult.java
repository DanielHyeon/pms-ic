package com.insuretech.pms.rfp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of RFP requirement extraction operation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractionResult {
    private boolean success;
    private int requirementCount;
    private String error;
}
