package com.insuretech.pms.governance.organization.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderWarningDto {

    private boolean hasWarning;
    private String partId;
    private String leaderUserId;
    private String leaderUserName;
    private List<String> missingCapabilities;
    private String message;
}
