package com.insuretech.pms.collaboration.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcNotice;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Lightweight notice DTO for list views (excludes full content body).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NoticeSummaryDto {
    private String id;
    private String projectId;
    private String title;
    private String priority;
    private String category;
    private String status;
    private Boolean pinned;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private String createdBy;
    private Boolean read;

    public static NoticeSummaryDto from(R2dbcNotice entity) {
        return NoticeSummaryDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .title(entity.getTitle())
                .priority(entity.getPriority())
                .category(entity.getCategory())
                .status(entity.getStatus())
                .pinned(entity.getPinned())
                .publishedAt(entity.getPublishedAt())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }
}
