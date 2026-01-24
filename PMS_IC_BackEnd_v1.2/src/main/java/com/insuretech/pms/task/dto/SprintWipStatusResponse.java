package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for sprint WIP status information.
 * Provides type-safe response for sprint WIP status queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SprintWipStatusResponse {

    private String sprintId;
    private String sprintName;
    private int currentWip;
    private Integer conwipLimit;
    private Boolean wipValidationEnabled;
    private String health;
    private Integer conwipPercentage;

    /**
     * Creates an error response when sprint is not found.
     */
    public static SprintWipStatusResponse notFound(String sprintId) {
        return SprintWipStatusResponse.builder()
                .sprintId(sprintId)
                .health("ERROR")
                .build();
    }
}
