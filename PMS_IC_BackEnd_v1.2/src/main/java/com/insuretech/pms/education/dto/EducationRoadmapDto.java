package com.insuretech.pms.education.dto;

import com.insuretech.pms.education.reactive.entity.R2dbcEducationRoadmap;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EducationRoadmapDto {
    private String id;
    private String educationId;
    private String educationTitle;
    private String targetRole;
    private String level;
    private Integer orderNum;
    private Boolean isRequired;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EducationRoadmapDto from(R2dbcEducationRoadmap roadmap) {
        return EducationRoadmapDto.builder()
                .id(roadmap.getId())
                .educationId(roadmap.getEducationId())
                .educationTitle(null)
                .targetRole(roadmap.getTargetRole())
                .level(roadmap.getLevel())
                .orderNum(roadmap.getOrderNum())
                .isRequired(roadmap.getIsRequired())
                .description(roadmap.getDescription())
                .createdAt(roadmap.getCreatedAt())
                .updatedAt(roadmap.getUpdatedAt())
                .build();
    }
}
