package com.insuretech.pms.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of an Excel import operation.
 * Contains counts for total, success, create, update, and error rows,
 * along with detailed error information for each failed row.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResult {

    /**
     * Total number of data rows processed (excluding header).
     */
    private int totalRows;

    /**
     * Number of rows successfully processed.
     */
    private int successCount;

    /**
     * Number of new records created.
     */
    private int createCount;

    /**
     * Number of existing records updated.
     */
    private int updateCount;

    /**
     * Number of rows with errors.
     */
    private int errorCount;

    /**
     * List of detailed errors for each failed row.
     */
    @Builder.Default
    private List<ImportError> errors = new ArrayList<>();

    /**
     * Adds an error to the error list and increments error count.
     */
    public void addError(int rowNumber, String column, String value, String message) {
        if (errors == null) {
            errors = new ArrayList<>();
        }
        errors.add(new ImportError(rowNumber, column, value, message));
        errorCount++;
    }

    /**
     * Increments the create count and success count.
     */
    public void incrementCreate() {
        createCount++;
        successCount++;
    }

    /**
     * Increments the update count and success count.
     */
    public void incrementUpdate() {
        updateCount++;
        successCount++;
    }

    /**
     * Returns true if there are no errors.
     */
    public boolean isSuccess() {
        return errorCount == 0;
    }

    /**
     * Returns a summary message.
     */
    public String getSummary() {
        return String.format(
            "Processed %d rows: %d created, %d updated, %d errors",
            totalRows, createCount, updateCount, errorCount
        );
    }
}
