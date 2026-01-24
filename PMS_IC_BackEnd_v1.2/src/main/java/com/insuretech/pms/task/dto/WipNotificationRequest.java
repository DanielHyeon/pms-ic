package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * DTO for WIP limit notification requests.
 * Used for soft limit warnings, hard limit violations, and CONWIP violations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WipNotificationRequest {

    @NotBlank(message = "Project ID is required")
    private String projectId;

    @NotBlank(message = "Target ID is required")
    private String targetId;      // columnId or sprintId

    @NotBlank(message = "Target name is required")
    private String targetName;    // columnName or sprintName

    @Positive(message = "Current WIP must be positive")
    private int currentWip;

    @Positive(message = "WIP limit must be positive")
    private int wipLimit;         // softLimit, hardLimit, or conwipLimit

    @NotBlank(message = "Recipient ID is required")
    private String recipientId;   // projectManagerId

    private WipNotificationType notificationType;

    public enum WipNotificationType {
        SOFT_LIMIT_WARNING,
        HARD_LIMIT_VIOLATION,
        CONWIP_VIOLATION
    }
}
