package com.insuretech.pms.audit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditEvidenceItemDto {
    private String id;
    private String evidenceType;
    private String title;
    private String description;
    private String status;
    private String phaseId;
    private String phaseName;
    private String sourceEntity;
    private String sourceEntityId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
