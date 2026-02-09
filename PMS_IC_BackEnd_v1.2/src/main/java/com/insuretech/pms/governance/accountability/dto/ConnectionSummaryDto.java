package com.insuretech.pms.governance.accountability.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionSummaryDto {

    private long partCount;
    private long totalMemberCount;
    private long activeDelegationCount;
}
