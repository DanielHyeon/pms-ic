package com.insuretech.pms.audit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.audit.reactive.entity.R2dbcEvidencePackage;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EvidencePackageDto {
    private String id;
    private String projectId;
    private String status;
    private String packageType;
    private Integer totalItems;
    private Integer processedItems;
    private String downloadUrl;
    private LocalDateTime downloadExpiresAt;
    private LocalDateTime sealedAt;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public static EvidencePackageDto from(R2dbcEvidencePackage entity) {
        return EvidencePackageDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .status(entity.getStatus())
                .packageType(entity.getPackageType())
                .totalItems(entity.getTotalItems())
                .processedItems(entity.getProcessedItems())
                .downloadUrl(entity.getDownloadUrl())
                .downloadExpiresAt(entity.getDownloadExpiresAt())
                .sealedAt(entity.getSealedAt())
                .errorMessage(entity.getErrorMessage())
                .createdAt(entity.getCreatedAt())
                .completedAt(entity.getCompletedAt())
                .build();
    }
}
