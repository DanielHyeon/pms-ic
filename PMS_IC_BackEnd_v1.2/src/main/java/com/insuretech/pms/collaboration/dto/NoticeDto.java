package com.insuretech.pms.collaboration.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcNotice;
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
public class NoticeDto {
    private String id;
    private String projectId;
    private String title;
    private String content;
    private String priority;
    private String category;
    private String status;
    private Boolean pinned;
    private LocalDateTime publishedAt;
    private String publishedBy;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
    private Boolean read;

    public static NoticeDto from(R2dbcNotice entity) {
        return NoticeDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .priority(entity.getPriority())
                .category(entity.getCategory())
                .status(entity.getStatus())
                .pinned(entity.getPinned())
                .publishedAt(entity.getPublishedAt())
                .publishedBy(entity.getPublishedBy())
                .expiresAt(entity.getExpiresAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
