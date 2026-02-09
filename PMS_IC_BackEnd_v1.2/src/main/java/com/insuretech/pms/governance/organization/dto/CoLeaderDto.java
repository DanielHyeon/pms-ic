package com.insuretech.pms.governance.organization.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoLeaderDto {

    private String userId;
    private String userName;
    private OffsetDateTime createdAt;
}
