package com.insuretech.pms.report.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request DTO for TextToSQL conversion
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TextToSqlRequest {

    @NotBlank(message = "Question is required")
    private String question;

    @NotBlank(message = "Project ID is required")
    private String projectId;

    // Optional - for context
    private String additionalContext;

    // Execute the generated SQL
    @Builder.Default
    private Boolean executeQuery = true;

    // Max rows to return
    @Builder.Default
    private Integer maxRows = 100;
}
