package com.insuretech.pms.rfp.dto;

import com.insuretech.pms.rfp.enums.Priority;
import com.insuretech.pms.rfp.enums.RequirementCategory;
import com.insuretech.pms.rfp.enums.RequirementStatus;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirement;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequirementDto {
    private String id;
    private String rfpId;
    private String projectId;
    private String code;
    private String title;
    private String description;
    private RequirementCategory category;
    private Priority priority;
    private RequirementStatus status;
    private Integer progress;
    private String sourceText;
    private Integer pageNumber;
    private String assigneeId;
    private LocalDate dueDate;
    private String acceptanceCriteria;
    private Integer estimatedEffort;
    private Integer actualEffort;

    // Progress tracking fields
    private Integer storyPoints;
    private Integer estimatedEffortHours;
    private Integer actualEffortHours;
    private Integer remainingEffortHours;
    private Integer progressPercentage;
    private LocalDateTime lastProgressUpdate;
    private String progressCalcMethod;

    private Set<String> linkedTaskIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RequirementDto fromEntity(R2dbcRequirement req) {
        RequirementCategory cat = null;
        Priority pri = null;
        RequirementStatus stat = null;
        try {
            if (req.getCategory() != null) cat = RequirementCategory.valueOf(req.getCategory());
            if (req.getPriority() != null) pri = Priority.valueOf(req.getPriority());
            if (req.getStatus() != null) stat = RequirementStatus.valueOf(req.getStatus());
        } catch (IllegalArgumentException ignored) {}

        return RequirementDto.builder()
                .id(req.getId())
                .rfpId(req.getRfpId())
                .projectId(req.getProjectId())
                .code(req.getCode())
                .title(req.getTitle())
                .description(req.getDescription())
                .category(cat)
                .priority(pri)
                .status(stat)
                .progress(req.getProgress())
                .sourceText(req.getSourceText())
                .pageNumber(req.getPageNumber())
                .assigneeId(req.getAssigneeId())
                .dueDate(req.getDueDate())
                .acceptanceCriteria(req.getAcceptanceCriteria())
                .estimatedEffort(req.getEstimatedEffort())
                .actualEffort(req.getActualEffort())
                .storyPoints(req.getStoryPoints())
                .estimatedEffortHours(req.getEstimatedEffortHours())
                .actualEffortHours(req.getActualEffortHours())
                .remainingEffortHours(req.getRemainingEffortHours())
                .progressPercentage(req.getProgressPercentage())
                .lastProgressUpdate(req.getLastProgressUpdate())
                .progressCalcMethod(req.getProgressCalcMethod())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .build();
    }
}
