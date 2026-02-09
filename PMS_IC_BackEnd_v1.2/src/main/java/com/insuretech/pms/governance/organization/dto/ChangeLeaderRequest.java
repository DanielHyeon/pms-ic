package com.insuretech.pms.governance.organization.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeLeaderRequest {

    private String newLeaderUserId;

    private String changeReason;
}
