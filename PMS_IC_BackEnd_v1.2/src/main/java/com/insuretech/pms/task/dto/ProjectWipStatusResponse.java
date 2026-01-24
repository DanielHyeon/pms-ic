package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for project-wide WIP status information.
 * Provides type-safe response for project WIP status queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectWipStatusResponse {

    private String projectId;
    private int totalWip;
    private List<ColumnWipStatusResponse> columnStatuses;
    private int bottleneckCount;
}
