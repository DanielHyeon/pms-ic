package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDto {
    private String id;
    private String name;
    private String description;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal budget;
    private BigDecimal aiWeight;
    private BigDecimal siWeight;
    private Integer progress;
    private Boolean isDefault;
    private List<PhaseDto> phases;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectDto from(R2dbcProject project) {
        return ProjectDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .budget(project.getBudget())
                .aiWeight(project.getAiWeight())
                .siWeight(project.getSiWeight())
                .progress(project.getProgress())
                .isDefault(project.getIsDefault())
                .phases(null) // Phases must be populated separately via join
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    public static ProjectDto from(R2dbcProject project, List<PhaseDto> phases) {
        return ProjectDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .budget(project.getBudget())
                .aiWeight(project.getAiWeight())
                .siWeight(project.getSiWeight())
                .progress(project.getProgress())
                .isDefault(project.getIsDefault())
                .phases(phases)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}