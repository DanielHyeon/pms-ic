package com.insuretech.pms.governance.organization.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrgPartRequest {

    @NotBlank
    private String name;

    private String customTypeName;
}
