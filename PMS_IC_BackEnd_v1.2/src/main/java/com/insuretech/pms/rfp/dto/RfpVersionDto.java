package com.insuretech.pms.rfp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfpVersion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RfpVersionDto {

    private String id;
    private String rfpId;
    private String versionLabel;
    private String fileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private String checksum;
    private String uploadedBy;
    private LocalDateTime uploadedAt;
    private LocalDateTime createdAt;

    public static RfpVersionDto from(R2dbcRfpVersion entity) {
        return RfpVersionDto.builder()
                .id(entity.getId())
                .rfpId(entity.getRfpId())
                .versionLabel(entity.getVersionLabel())
                .fileName(entity.getFileName())
                .filePath(entity.getFilePath())
                .fileType(entity.getFileType())
                .fileSize(entity.getFileSize())
                .checksum(entity.getChecksum())
                .uploadedBy(entity.getUploadedBy())
                .uploadedAt(entity.getUploadedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
