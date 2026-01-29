package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcPart;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartDto {
    private String id;
    private String name;
    private String description;
    private String projectId;
    private String leaderId;
    private String leaderName;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer progress;
    private Set<String> memberIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PartDto from(R2dbcPart part) {
        return PartDto.builder()
                .id(part.getId())
                .name(part.getName())
                .description(part.getDescription())
                .projectId(part.getProjectId())
                .leaderId(part.getLeaderId())
                .leaderName(part.getLeaderName())
                .status(part.getStatus())
                .startDate(part.getStartDate())
                .endDate(part.getEndDate())
                .progress(part.getProgress())
                .memberIds(null) // Member IDs must be populated separately via join
                .createdAt(part.getCreatedAt())
                .updatedAt(part.getUpdatedAt())
                .build();
    }

    public static PartDto from(R2dbcPart part, Set<String> memberIds) {
        return PartDto.builder()
                .id(part.getId())
                .name(part.getName())
                .description(part.getDescription())
                .projectId(part.getProjectId())
                .leaderId(part.getLeaderId())
                .leaderName(part.getLeaderName())
                .status(part.getStatus())
                .startDate(part.getStartDate())
                .endDate(part.getEndDate())
                .progress(part.getProgress())
                .memberIds(memberIds)
                .createdAt(part.getCreatedAt())
                .updatedAt(part.getUpdatedAt())
                .build();
    }
}
