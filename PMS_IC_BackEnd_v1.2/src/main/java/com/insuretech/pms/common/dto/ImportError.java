package com.insuretech.pms.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents an error that occurred during Excel import for a specific row.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportError {

    /**
     * The row number in the Excel file (1-based, including header).
     * For example, if header is row 1 and first data row is row 2,
     * an error in the first data row would have rowNumber = 2.
     */
    private int rowNumber;

    /**
     * The column name or letter where the error occurred.
     */
    private String column;

    /**
     * The value that caused the error (may be null or truncated for long values).
     */
    private String value;

    /**
     * Human-readable error message describing what went wrong.
     */
    private String message;

    /**
     * Creates a simple error with just row number and message.
     */
    public static ImportError of(int rowNumber, String message) {
        return new ImportError(rowNumber, null, null, message);
    }

    /**
     * Creates an error with column information.
     */
    public static ImportError of(int rowNumber, String column, String message) {
        return new ImportError(rowNumber, column, null, message);
    }

    /**
     * Creates a complete error with all details.
     */
    public static ImportError of(int rowNumber, String column, String value, String message) {
        // Truncate long values
        String truncatedValue = value;
        if (value != null && value.length() > 100) {
            truncatedValue = value.substring(0, 97) + "...";
        }
        return new ImportError(rowNumber, column, truncatedValue, message);
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("Row ").append(rowNumber);
        if (column != null) {
            sb.append(", Column '").append(column).append("'");
        }
        if (value != null) {
            sb.append(" (value: ").append(value).append(")");
        }
        sb.append(": ").append(message);
        return sb.toString();
    }
}
