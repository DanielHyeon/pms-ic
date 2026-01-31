package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcDeliverable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliverableDto {
    private String id;
    private String phaseId;
    private String name;
    private String description;
    private String type;
    private String status;
    private String fileName;
    private Long fileSize;
    private String uploadedBy;
    private String approver;
    private LocalDateTime uploadedAt;
    private LocalDateTime approvedAt;

    // RAG indexing fields
    private String ragStatus;
    private String ragLastError;
    private LocalDateTime ragUpdatedAt;
    private Integer ragVersion;
    private String ragDocId;

    public static DeliverableDto from(R2dbcDeliverable deliverable) {
        return DeliverableDto.builder()
                .id(deliverable.getId())
                .phaseId(deliverable.getPhaseId())
                .name(deliverable.getName())
                .description(deliverable.getDescription())
                .type(deliverable.getType())
                .status(deliverable.getStatus())
                .fileName(deliverable.getFileName())
                .fileSize(deliverable.getFileSize())
                .uploadedBy(deliverable.getUploadedBy())
                .approver(deliverable.getApprover())
                .uploadedAt(deliverable.getCreatedAt())
                .approvedAt(deliverable.getApprovedAt())
                .ragStatus(deliverable.getRagStatus())
                .ragLastError(deliverable.getRagLastError())
                .ragUpdatedAt(deliverable.getRagUpdatedAt())
                .ragVersion(deliverable.getRagVersion())
                .ragDocId(deliverable.getRagDocId())
                .build();
    }
}
