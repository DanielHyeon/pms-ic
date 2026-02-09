package com.insuretech.pms.governance.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrgPartRequest {

    @NotBlank
    private String name;

    @NotNull
    private PartType partType;

    private String customTypeName;

    private String leaderUserId;

    public enum PartType {
        AI_DEVELOPMENT, SI_DEVELOPMENT, QA,
        BUSINESS_ANALYSIS, COMMON, PMO, CUSTOM
    }
}
