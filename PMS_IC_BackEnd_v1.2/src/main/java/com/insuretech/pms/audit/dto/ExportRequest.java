package com.insuretech.pms.audit.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExportRequest {
    private String projectId;
    private String packageType;
    private List<String> evidenceIds;
    private String filterSnapshot;
}
