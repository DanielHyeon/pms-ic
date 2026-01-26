package com.insuretech.pms.common.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

/**
 * Common Excel utility service using Apache POI.
 * Provides helper methods for creating workbooks, styling, data validation, and cell parsing.
 */
@Slf4j
@Service
public class ExcelService {

    /**
     * Creates a new XLSX workbook.
     */
    public XSSFWorkbook createWorkbook() {
        return new XSSFWorkbook();
    }

    /**
     * Creates a header cell style with bold font and background color.
     */
    public CellStyle createHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();

        // Bold font
        XSSFFont font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        // Light gray background
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        // Border
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        // Center alignment
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        return style;
    }

    /**
     * Creates a standard data cell style.
     */
    public CellStyle createDataStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        return style;
    }

    /**
     * Creates a date cell style with YYYY-MM-DD format.
     */
    public CellStyle createDateStyle(XSSFWorkbook workbook) {
        CellStyle style = createDataStyle(workbook);
        CreationHelper createHelper = workbook.getCreationHelper();
        style.setDataFormat(createHelper.createDataFormat().getFormat("yyyy-mm-dd"));
        return style;
    }

    /**
     * Creates header row with given column names.
     */
    public void createHeaderRow(Sheet sheet, String[] headers, CellStyle headerStyle) {
        Row row = sheet.createRow(0);
        row.setHeightInPoints(25);

        for (int i = 0; i < headers.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }

    /**
     * Adds dropdown data validation to a column.
     */
    public void addDropdownValidation(Sheet sheet, int column, String[] values, int startRow, int endRow) {
        DataValidationHelper validationHelper = sheet.getDataValidationHelper();
        DataValidationConstraint constraint = validationHelper.createExplicitListConstraint(values);
        CellRangeAddressList addressList = new CellRangeAddressList(startRow, endRow, column, column);
        DataValidation validation = validationHelper.createValidation(constraint, addressList);

        validation.setShowErrorBox(true);
        validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
        validation.createErrorBox("Invalid Value", "Please select a value from the dropdown list.");
        validation.setSuppressDropDownArrow(true);

        sheet.addValidationData(validation);
    }

    /**
     * Auto-sizes columns based on content.
     */
    public void autoSizeColumns(Sheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
            // Set minimum width
            int currentWidth = sheet.getColumnWidth(i);
            if (currentWidth < 3000) {
                sheet.setColumnWidth(i, 3000);
            }
            // Set maximum width
            if (currentWidth > 15000) {
                sheet.setColumnWidth(i, 15000);
            }
        }
    }

    // =============================================
    // Cell Value Parsing Methods
    // =============================================

    /**
     * Gets string value from cell, handling different cell types.
     */
    public String getCellStringValue(Cell cell) {
        if (cell == null) {
            return null;
        }

        try {
            switch (cell.getCellType()) {
                case STRING:
                    String value = cell.getStringCellValue();
                    return value != null ? value.trim() : null;
                case NUMERIC:
                    if (DateUtil.isCellDateFormatted(cell)) {
                        LocalDate date = getCellDateValue(cell);
                        return date != null ? date.toString() : null;
                    }
                    // Return number without decimal if it's a whole number
                    double numValue = cell.getNumericCellValue();
                    if (numValue == Math.floor(numValue)) {
                        return String.valueOf((long) numValue);
                    }
                    return String.valueOf(numValue);
                case BOOLEAN:
                    return String.valueOf(cell.getBooleanCellValue());
                case FORMULA:
                    try {
                        return cell.getStringCellValue();
                    } catch (Exception e) {
                        return String.valueOf(cell.getNumericCellValue());
                    }
                case BLANK:
                    return null;
                default:
                    return null;
            }
        } catch (Exception e) {
            log.warn("Error reading cell value at row {} col {}: {}",
                cell.getRowIndex(), cell.getColumnIndex(), e.getMessage());
            return null;
        }
    }

    /**
     * Gets integer value from cell.
     */
    public Integer getCellIntegerValue(Cell cell) {
        if (cell == null) {
            return null;
        }

        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    return (int) cell.getNumericCellValue();
                case STRING:
                    String strValue = cell.getStringCellValue();
                    if (strValue == null || strValue.trim().isEmpty()) {
                        return null;
                    }
                    return Integer.parseInt(strValue.trim());
                case FORMULA:
                    return (int) cell.getNumericCellValue();
                default:
                    return null;
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid integer at row {} col {}: {}",
                cell.getRowIndex(), cell.getColumnIndex(), e.getMessage());
            return null;
        }
    }

    /**
     * Gets LocalDate value from cell.
     */
    public LocalDate getCellDateValue(Cell cell) {
        if (cell == null) {
            return null;
        }

        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    if (DateUtil.isCellDateFormatted(cell)) {
                        Date date = cell.getDateCellValue();
                        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                    }
                    return null;
                case STRING:
                    String strValue = cell.getStringCellValue();
                    if (strValue == null || strValue.trim().isEmpty()) {
                        return null;
                    }
                    return LocalDate.parse(strValue.trim());
                default:
                    return null;
            }
        } catch (Exception e) {
            log.warn("Invalid date at row {} col {}: {}",
                cell.getRowIndex(), cell.getColumnIndex(), e.getMessage());
            return null;
        }
    }

    /**
     * Gets LocalDateTime value from cell.
     */
    public LocalDateTime getCellDateTimeValue(Cell cell) {
        if (cell == null) {
            return null;
        }

        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                Date date = cell.getDateCellValue();
                return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
            }
            return null;
        } catch (Exception e) {
            log.warn("Invalid datetime at row {} col {}: {}",
                cell.getRowIndex(), cell.getColumnIndex(), e.getMessage());
            return null;
        }
    }

    /**
     * Sets cell value with proper type handling.
     */
    public void setCellValue(Cell cell, Object value, CellStyle style) {
        if (value == null) {
            cell.setBlank();
        } else if (value instanceof String) {
            cell.setCellValue((String) value);
        } else if (value instanceof Integer) {
            cell.setCellValue((Integer) value);
        } else if (value instanceof Long) {
            cell.setCellValue((Long) value);
        } else if (value instanceof Double) {
            cell.setCellValue((Double) value);
        } else if (value instanceof LocalDate) {
            cell.setCellValue(java.sql.Date.valueOf((LocalDate) value));
        } else if (value instanceof LocalDateTime) {
            cell.setCellValue(java.sql.Timestamp.valueOf((LocalDateTime) value));
        } else if (value instanceof Boolean) {
            cell.setCellValue((Boolean) value);
        } else {
            cell.setCellValue(value.toString());
        }

        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    /**
     * Checks if a row is empty (all cells are blank).
     */
    public boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }

        for (int i = row.getFirstCellNum(); i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellStringValue(cell);
                if (value != null && !value.isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }
}
