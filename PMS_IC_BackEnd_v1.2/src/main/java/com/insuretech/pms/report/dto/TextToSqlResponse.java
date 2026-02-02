package com.insuretech.pms.report.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for TextToSQL conversion
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TextToSqlResponse {

    private Boolean success;
    private String sql;
    private String explanation;
    private BigDecimal confidence;

    // Query results (if executed)
    private List<Map<String, Object>> results;
    private Integer resultCount;

    // Security info
    private Boolean wasSanitized;
    private String sanitizationNotes;

    // Performance
    private Integer generationMs;
    private Integer executionMs;

    // Error info
    private String errorMessage;
    private String errorCode;
}
