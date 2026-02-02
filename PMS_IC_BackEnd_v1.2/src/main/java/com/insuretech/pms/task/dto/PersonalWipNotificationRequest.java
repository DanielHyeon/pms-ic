package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * DTO for personal WIP limit violation notification requests.
 * Used when an assignee exceeds their personal WIP limit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalWipNotificationRequest {

    @NotBlank(message = "Project ID is required")
    private String projectId;

    @NotBlank(message = "Assignee ID is required")
    private String assigneeId;

    @NotBlank(message = "Assignee name is required")
    private String assigneeName;

    @Positive(message = "Current WIP must be positive")
    private int currentWip;

    @Positive(message = "Max WIP must be positive")
    private int maxWip;
}
