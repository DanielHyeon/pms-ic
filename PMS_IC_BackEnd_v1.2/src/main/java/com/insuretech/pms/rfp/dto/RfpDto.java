package com.insuretech.pms.rfp.dto;

import com.insuretech.pms.rfp.enums.ProcessingStatus;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfp;
import com.insuretech.pms.rfp.enums.RfpStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RfpDto {
    private String id;
    private String projectId;
    private String title;
    private String content;
    private String filePath;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private RfpStatus status;
    private ProcessingStatus processingStatus;
    private String processingMessage;
    private LocalDateTime submittedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int requirementCount;

    public static RfpDto fromEntity(R2dbcRfp rfp) {
        RfpStatus rfpStatus = null;
        ProcessingStatus procStatus = null;
        try {
            if (rfp.getStatus() != null) rfpStatus = RfpStatus.valueOf(rfp.getStatus());
            if (rfp.getProcessingStatus() != null) procStatus = ProcessingStatus.valueOf(rfp.getProcessingStatus());
        } catch (IllegalArgumentException ignored) {}

        return RfpDto.builder()
                .id(rfp.getId())
                .projectId(rfp.getProjectId())
                .title(rfp.getTitle())
                .content(rfp.getContent())
                .filePath(rfp.getFilePath())
                .fileName(rfp.getFileName())
                .fileType(rfp.getFileType())
                .fileSize(rfp.getFileSize())
                .status(rfpStatus)
                .processingStatus(procStatus)
                .processingMessage(rfp.getProcessingMessage())
                .submittedAt(rfp.getSubmittedAt())
                .createdAt(rfp.getCreatedAt())
                .updatedAt(rfp.getUpdatedAt())
                .requirementCount(0)
                .build();
    }
}
