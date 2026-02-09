package com.insuretech.pms.rfp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SetOriginRequest {
    @NotBlank
    @Pattern(regexp = "EXTERNAL_RFP|INTERNAL_INITIATIVE|MODERNIZATION|MIXED",
             message = "originType must be one of: EXTERNAL_RFP, INTERNAL_INITIATIVE, MODERNIZATION, MIXED")
    private String originType;
}
