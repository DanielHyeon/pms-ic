package com.insuretech.pms.rfp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassifyRfpResponse {
    private String rfpId;
    private int aiCount;
    private int siCount;
    private int commonCount;
    private int nonFunctionalCount;
    private String message;
}
