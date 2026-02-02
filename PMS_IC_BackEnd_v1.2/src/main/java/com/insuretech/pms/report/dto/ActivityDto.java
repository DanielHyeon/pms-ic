package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityDto {
    private String user;
    private String action;
    private String time;
    private String type; // success, info, warning, error
    private String projectId;   // for tenant-aware filtering
    private String projectName; // for display in portfolio view
}
