package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * DTO for bottleneck alert notification requests.
 * Used when a workflow bottleneck is detected in a kanban column.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BottleneckAlertRequest {

    @NotBlank(message = "Project ID is required")
    private String projectId;

    @NotBlank(message = "Column ID is required")
    private String columnId;

    @NotBlank(message = "Column name is required")
    private String columnName;

    @PositiveOrZero(message = "Blocking tasks count cannot be negative")
    private int blockingTasks;

    @PositiveOrZero(message = "Affected tasks count cannot be negative")
    private int affectedTasks;

    @NotBlank(message = "Project manager ID is required")
    private String projectManagerId;
}
