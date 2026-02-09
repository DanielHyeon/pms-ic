package com.insuretech.pms.governance.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberRequest {

    @NotBlank
    private String userId;

    @NotNull
    private MembershipType membershipType;

    public enum MembershipType {
        PRIMARY, SECONDARY
    }
}
