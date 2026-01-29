package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.Project;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

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

    public static ProjectDto from(Project project) {
        return ProjectDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus().name())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .budget(project.getBudget())
                .progress(project.getProgress())
                .isDefault(project.isDefault())
                .phases(project.getPhases() != null ?
                        project.getPhases().stream()
                                .map(PhaseDto::from)
                                .collect(Collectors.toList()) : null)
                .build();
    }
}