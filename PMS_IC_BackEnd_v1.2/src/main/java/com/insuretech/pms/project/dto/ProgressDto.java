package com.insuretech.pms.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressDto {
    private String id;
    private String name;
    private Integer progressPercentage;
    private String progressStage;
    private String type;
    private Integer completedTasks;
    private Integer totalTasks;
}
