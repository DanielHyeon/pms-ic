package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for column WIP status information.
 * Provides type-safe response for column WIP status queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ColumnWipStatusResponse {

    private String columnId;
    private String columnName;
    private int currentWip;
    private Integer wipLimitSoft;
    private Integer wipLimitHard;
    private Boolean isBottleneck;
    private String health;
    private Integer hardLimitPercentage;
    private Integer softLimitPercentage;

    /**
     * Health status enum for better type safety.
     */
    public enum HealthStatus {
        GREEN,   // Under soft limit
        YELLOW,  // At soft limit
        RED,     // At hard limit
        UNKNOWN  // No limits configured
    }

    /**
     * Creates an error response when column is not found.
     */
    public static ColumnWipStatusResponse notFound(String columnId) {
        return ColumnWipStatusResponse.builder()
                .columnId(columnId)
                .health("ERROR")
                .build();
    }
}
