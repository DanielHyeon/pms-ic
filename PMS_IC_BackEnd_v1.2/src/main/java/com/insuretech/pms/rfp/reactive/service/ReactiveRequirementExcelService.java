package com.insuretech.pms.rfp.reactive.service;

import com.insuretech.pms.common.service.ExcelService;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirement;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

/**
 * Reactive Requirement Excel Service for import/export operations.
 * Provides functionality to export requirements to Excel and import from Excel templates.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveRequirementExcelService {

    private final ExcelService excelService;
    private final ReactiveRequirementRepository requirementRepository;

    // Excel column headers for Requirement export
    private static final String[] REQUIREMENT_HEADERS = {
            "Code", "Title", "Description", "Category", "Priority", "Status",
            "Progress (%)", "Source Text", "Page Number", "Assignee ID",
            "Due Date", "Acceptance Criteria", "Story Points",
            "Estimated Hours", "Actual Hours", "Remaining Hours"
    };

    private static final String[] CATEGORY_VALUES = {
            "FUNCTIONAL", "NON_FUNCTIONAL", "TECHNICAL", "BUSINESS"
    };

    private static final String[] PRIORITY_VALUES = {
            "LOW", "MEDIUM", "HIGH", "CRITICAL"
    };

    private static final String[] STATUS_VALUES = {
            "IDENTIFIED", "ANALYZED", "APPROVED", "DEFERRED", "REJECTED", "IMPLEMENTED", "VERIFIED"
    };

    /**
     * Export requirements to Excel workbook for a project.
     *
     * @param projectId Project ID
     * @return Mono<Resource> containing the Excel file
     */
    public Mono<Resource> exportToExcel(String projectId) {
        return Mono.defer(() -> {
            log.info("Starting requirement export for project: {}", projectId);

            return requirementRepository.findByProjectIdOrderByCodeAsc(projectId)
                    .collectList()
                    .flatMap(this::generateExcelWorkbook)
                    .subscribeOn(Schedulers.boundedElastic());
        });
    }

    /**
     * Export requirements by RFP to Excel.
     *
     * @param rfpId RFP ID
     * @return Mono<Resource> containing the Excel file
     */
    public Mono<Resource> exportByRfpToExcel(String rfpId) {
        return Mono.defer(() -> {
            log.info("Starting requirement export for RFP: {}", rfpId);

            return requirementRepository.findByRfpId(rfpId)
                    .collectList()
                    .flatMap(this::generateExcelWorkbook)
                    .subscribeOn(Schedulers.boundedElastic());
        });
    }

    /**
     * Generate a blank requirement template with headers and validations.
     *
     * @return Mono<Resource> containing the template Excel file
     */
    public Mono<Resource> generateTemplate() {
        return Mono.fromCallable(() -> {
            log.info("Generating requirement Excel template");

            XSSFWorkbook workbook = excelService.createWorkbook();
            Sheet sheet = workbook.createSheet("Requirements");

            // Create header style and row
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            excelService.createHeaderRow(sheet, REQUIREMENT_HEADERS, headerStyle);

            // Add dropdown validations
            excelService.addDropdownValidation(sheet, 3, CATEGORY_VALUES, 1, 1000);
            excelService.addDropdownValidation(sheet, 4, PRIORITY_VALUES, 1, 1000);
            excelService.addDropdownValidation(sheet, 5, STATUS_VALUES, 1, 1000);

            // Create sample rows with instructions
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            createSampleRows(sheet, dataStyle);

            // Auto-size columns
            excelService.autoSizeColumns(sheet, REQUIREMENT_HEADERS.length);

            // Add instruction sheet
            addInstructionSheet(workbook);

            return writeWorkbookToResource(workbook);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Import requirements from Excel file.
     *
     * @param filePart  Uploaded file
     * @param projectId Project ID
     * @param rfpId     Optional RFP ID
     * @param tenantId  Tenant ID
     * @return Mono<RequirementImportResult> with import statistics
     */
    public Mono<RequirementImportResult> importFromExcel(FilePart filePart, String projectId,
                                                          String rfpId, String tenantId) {
        return DataBufferUtils.join(filePart.content())
                .flatMap(dataBuffer -> {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    DataBufferUtils.release(dataBuffer);

                    return parseAndImportRequirements(bytes, projectId, rfpId, tenantId);
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Import requirements from byte array.
     *
     * @param fileBytes Excel file bytes
     * @param projectId Project ID
     * @param rfpId     Optional RFP ID
     * @param tenantId  Tenant ID
     * @return Mono<RequirementImportResult> with import statistics
     */
    public Mono<RequirementImportResult> importFromBytes(byte[] fileBytes, String projectId,
                                                          String rfpId, String tenantId) {
        return parseAndImportRequirements(fileBytes, projectId, rfpId, tenantId)
                .subscribeOn(Schedulers.boundedElastic());
    }

    // =============================================
    // Private Export Methods
    // =============================================

    private Mono<Resource> generateExcelWorkbook(List<R2dbcRequirement> requirements) {
        return Mono.fromCallable(() -> {
            XSSFWorkbook workbook = excelService.createWorkbook();
            Sheet sheet = workbook.createSheet("Requirements");

            // Styles
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            CellStyle dateStyle = excelService.createDateStyle(workbook);

            // Create header row
            excelService.createHeaderRow(sheet, REQUIREMENT_HEADERS, headerStyle);

            // Write data rows
            int rowNum = 1;
            for (R2dbcRequirement req : requirements) {
                Row row = sheet.createRow(rowNum++);
                writeRequirementRow(row, req, dataStyle, dateStyle);
            }

            // Add validations
            excelService.addDropdownValidation(sheet, 3, CATEGORY_VALUES, 1, rowNum);
            excelService.addDropdownValidation(sheet, 4, PRIORITY_VALUES, 1, rowNum);
            excelService.addDropdownValidation(sheet, 5, STATUS_VALUES, 1, rowNum);

            // Auto-size columns
            excelService.autoSizeColumns(sheet, REQUIREMENT_HEADERS.length);

            log.info("Generated requirement Excel with {} rows", requirements.size());

            return writeWorkbookToResource(workbook);
        });
    }

    private void writeRequirementRow(Row row, R2dbcRequirement req, CellStyle dataStyle, CellStyle dateStyle) {
        int col = 0;
        excelService.setCellValue(row.createCell(col++), req.getCode(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getTitle(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getDescription(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getCategory(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getPriority(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getStatus(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getProgressPercentage(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getSourceText(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getPageNumber(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getAssigneeId(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getDueDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), req.getAcceptanceCriteria(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getStoryPoints(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getEstimatedEffortHours(), dataStyle);
        excelService.setCellValue(row.createCell(col++), req.getActualEffortHours(), dataStyle);
        excelService.setCellValue(row.createCell(col), req.getRemainingEffortHours(), dataStyle);
    }

    private void createSampleRows(Sheet sheet, CellStyle dataStyle) {
        // Example row 1
        Row row1 = sheet.createRow(1);
        excelService.setCellValue(row1.createCell(0), "REQ-001", dataStyle);
        excelService.setCellValue(row1.createCell(1), "User Login Feature", dataStyle);
        excelService.setCellValue(row1.createCell(2), "Users should be able to login with email/password", dataStyle);
        excelService.setCellValue(row1.createCell(3), "FUNCTIONAL", dataStyle);
        excelService.setCellValue(row1.createCell(4), "HIGH", dataStyle);
        excelService.setCellValue(row1.createCell(5), "IDENTIFIED", dataStyle);
        excelService.setCellValue(row1.createCell(6), 0, dataStyle);
        excelService.setCellValue(row1.createCell(12), 5, dataStyle);
        excelService.setCellValue(row1.createCell(13), 40, dataStyle);

        // Example row 2
        Row row2 = sheet.createRow(2);
        excelService.setCellValue(row2.createCell(0), "REQ-002", dataStyle);
        excelService.setCellValue(row2.createCell(1), "System Performance", dataStyle);
        excelService.setCellValue(row2.createCell(2), "Response time must be under 2 seconds", dataStyle);
        excelService.setCellValue(row2.createCell(3), "NON_FUNCTIONAL", dataStyle);
        excelService.setCellValue(row2.createCell(4), "MEDIUM", dataStyle);
        excelService.setCellValue(row2.createCell(5), "IDENTIFIED", dataStyle);
        excelService.setCellValue(row2.createCell(6), 0, dataStyle);
        excelService.setCellValue(row2.createCell(12), 3, dataStyle);
        excelService.setCellValue(row2.createCell(13), 24, dataStyle);
    }

    private void addInstructionSheet(XSSFWorkbook workbook) {
        Sheet instructionSheet = workbook.createSheet("Instructions");
        CellStyle boldStyle = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        boldStyle.setFont(font);

        String[] instructions = {
                "Requirement Import Instructions",
                "",
                "Required Fields:",
                "  - Code: Unique identifier (e.g., REQ-001)",
                "  - Title: Short descriptive title",
                "",
                "Optional Fields:",
                "  - Description: Detailed requirement description",
                "  - Category: FUNCTIONAL, NON_FUNCTIONAL, TECHNICAL, or BUSINESS",
                "  - Priority: LOW, MEDIUM, HIGH, or CRITICAL",
                "  - Status: IDENTIFIED, ANALYZED, APPROVED, DEFERRED, REJECTED, IMPLEMENTED, VERIFIED",
                "  - Progress (%): Integer between 0 and 100",
                "  - Source Text: Original text from RFP document",
                "  - Page Number: Page reference in source document",
                "  - Assignee ID: User ID of assigned team member",
                "  - Due Date: YYYY-MM-DD format",
                "  - Acceptance Criteria: Criteria for requirement completion",
                "  - Story Points: Relative complexity estimate",
                "  - Estimated Hours: Expected work hours",
                "  - Actual Hours: Actual work hours spent",
                "  - Remaining Hours: Hours remaining to complete",
                "",
                "Notes:",
                "  - Existing requirements with same code will be updated",
                "  - New codes will create new requirements",
                "  - Empty rows will be skipped"
        };

        for (int i = 0; i < instructions.length; i++) {
            Row row = instructionSheet.createRow(i);
            Cell cell = row.createCell(0);
            cell.setCellValue(instructions[i]);
            if (i == 0) {
                cell.setCellStyle(boldStyle);
            }
        }

        instructionSheet.setColumnWidth(0, 20000);
    }

    // =============================================
    // Private Import Methods
    // =============================================

    private Mono<RequirementImportResult> parseAndImportRequirements(byte[] fileBytes, String projectId,
                                                                      String rfpId, String tenantId) {
        return Mono.<ParseResult>fromCallable(() -> {
            RequirementImportResult result = new RequirementImportResult();

            try (ByteArrayInputStream bais = new ByteArrayInputStream(fileBytes);
                 Workbook workbook = new XSSFWorkbook(bais)) {

                Sheet sheet = workbook.getSheetAt(0);
                if (sheet == null) {
                    result.addError("No sheet found in workbook");
                    return new ParseResult(null, result);
                }

                // Parse rows (skip header)
                List<RequirementRowData> rows = new ArrayList<>();
                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null || excelService.isRowEmpty(row)) {
                        continue;
                    }

                    RequirementRowData rowData = parseRow(row, i + 1);
                    if (rowData != null && rowData.getCode() != null && !rowData.getCode().isEmpty()) {
                        rows.add(rowData);
                    } else if (rowData != null && (rowData.getCode() == null || rowData.getCode().isEmpty())) {
                        result.addWarning("Row " + (i + 1) + ": Missing required field 'Code', skipped");
                    }
                }

                result.setTotalRows(rows.size());
                return new ParseResult(rows, result);

            } catch (Exception e) {
                log.error("Error parsing Excel file", e);
                result.addError("Failed to parse Excel file: " + e.getMessage());
                return new ParseResult(null, result);
            }
        }).flatMap(parseResult -> {
            if (parseResult.rows() == null || parseResult.rows().isEmpty()) {
                return Mono.just(parseResult.result());
            }

            return importRequirementRows(parseResult.rows(), projectId, rfpId, tenantId, parseResult.result());
        });
    }

    private RequirementRowData parseRow(Row row, int rowNum) {
        RequirementRowData data = new RequirementRowData();
        data.setRowNum(rowNum);
        data.setCode(excelService.getCellStringValue(row.getCell(0)));
        data.setTitle(excelService.getCellStringValue(row.getCell(1)));
        data.setDescription(excelService.getCellStringValue(row.getCell(2)));
        data.setCategory(excelService.getCellStringValue(row.getCell(3)));
        data.setPriority(excelService.getCellStringValue(row.getCell(4)));
        data.setStatus(excelService.getCellStringValue(row.getCell(5)));
        data.setProgress(excelService.getCellIntegerValue(row.getCell(6)));
        data.setSourceText(excelService.getCellStringValue(row.getCell(7)));
        data.setPageNumber(excelService.getCellIntegerValue(row.getCell(8)));
        data.setAssigneeId(excelService.getCellStringValue(row.getCell(9)));
        data.setDueDate(excelService.getCellDateValue(row.getCell(10)));
        data.setAcceptanceCriteria(excelService.getCellStringValue(row.getCell(11)));
        data.setStoryPoints(excelService.getCellIntegerValue(row.getCell(12)));
        data.setEstimatedHours(excelService.getCellIntegerValue(row.getCell(13)));
        data.setActualHours(excelService.getCellIntegerValue(row.getCell(14)));
        data.setRemainingHours(excelService.getCellIntegerValue(row.getCell(15)));

        return data;
    }

    private Mono<RequirementImportResult> importRequirementRows(List<RequirementRowData> rows,
                                                                 String projectId, String rfpId,
                                                                 String tenantId,
                                                                 RequirementImportResult result) {
        return reactor.core.publisher.Flux.fromIterable(rows)
                .concatMap(rowData -> processRequirementRow(rowData, projectId, rfpId, tenantId, result))
                .then(Mono.just(result))
                .doOnSuccess(r -> log.info("Requirement import completed: {} total, {} created, {} updated, {} errors",
                        r.getTotalRows(), r.getCreated(), r.getUpdated(), r.getErrors().size()));
    }

    private Mono<Void> processRequirementRow(RequirementRowData rowData, String projectId,
                                              String rfpId, String tenantId,
                                              RequirementImportResult result) {
        // Check if requirement with this code already exists
        return requirementRepository.findByCode(rowData.getCode())
                .flatMap(existing -> {
                    // Update existing requirement
                    updateRequirementFromRowData(existing, rowData);
                    return requirementRepository.save(existing)
                            .doOnSuccess(saved -> {
                                result.incrementUpdated();
                                log.debug("Updated requirement: {}", saved.getCode());
                            })
                            .then();
                })
                .switchIfEmpty(Mono.defer(() -> {
                    // Create new requirement
                    R2dbcRequirement newReq = createRequirementFromRowData(rowData, projectId, rfpId, tenantId);
                    return requirementRepository.save(newReq)
                            .doOnSuccess(saved -> {
                                result.incrementCreated();
                                log.debug("Created requirement: {}", saved.getCode());
                            })
                            .then();
                }))
                .onErrorResume(e -> {
                    result.addError("Row " + rowData.getRowNum() + ": " + e.getMessage());
                    return Mono.empty();
                });
    }

    private R2dbcRequirement createRequirementFromRowData(RequirementRowData data, String projectId,
                                                           String rfpId, String tenantId) {
        return R2dbcRequirement.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .rfpId(rfpId)
                .tenantId(tenantId)
                .code(data.getCode())
                .title(data.getTitle() != null ? data.getTitle() : data.getCode())
                .description(data.getDescription())
                .category(validateCategory(data.getCategory()))
                .priority(validatePriority(data.getPriority()))
                .status(validateStatus(data.getStatus()))
                .progress(data.getProgress() != null ? data.getProgress() : 0)
                .progressPercentage(data.getProgress() != null ? data.getProgress() : 0)
                .sourceText(data.getSourceText())
                .pageNumber(data.getPageNumber())
                .assigneeId(data.getAssigneeId())
                .dueDate(data.getDueDate())
                .acceptanceCriteria(data.getAcceptanceCriteria())
                .storyPoints(data.getStoryPoints())
                .estimatedEffortHours(data.getEstimatedHours())
                .actualEffortHours(data.getActualHours())
                .remainingEffortHours(data.getRemainingHours())
                .build();
    }

    private void updateRequirementFromRowData(R2dbcRequirement existing, RequirementRowData data) {
        if (data.getTitle() != null) existing.setTitle(data.getTitle());
        if (data.getDescription() != null) existing.setDescription(data.getDescription());
        if (data.getCategory() != null) existing.setCategory(validateCategory(data.getCategory()));
        if (data.getPriority() != null) existing.setPriority(validatePriority(data.getPriority()));
        if (data.getStatus() != null) existing.setStatus(validateStatus(data.getStatus()));
        if (data.getProgress() != null) {
            existing.setProgress(data.getProgress());
            existing.setProgressPercentage(data.getProgress());
        }
        if (data.getSourceText() != null) existing.setSourceText(data.getSourceText());
        if (data.getPageNumber() != null) existing.setPageNumber(data.getPageNumber());
        if (data.getAssigneeId() != null) existing.setAssigneeId(data.getAssigneeId());
        if (data.getDueDate() != null) existing.setDueDate(data.getDueDate());
        if (data.getAcceptanceCriteria() != null) existing.setAcceptanceCriteria(data.getAcceptanceCriteria());
        if (data.getStoryPoints() != null) existing.setStoryPoints(data.getStoryPoints());
        if (data.getEstimatedHours() != null) existing.setEstimatedEffortHours(data.getEstimatedHours());
        if (data.getActualHours() != null) existing.setActualEffortHours(data.getActualHours());
        if (data.getRemainingHours() != null) existing.setRemainingEffortHours(data.getRemainingHours());
    }

    private String validateCategory(String category) {
        if (category == null) return "FUNCTIONAL";
        String upper = category.toUpperCase();
        return Arrays.asList(CATEGORY_VALUES).contains(upper) ? upper : "FUNCTIONAL";
    }

    private String validatePriority(String priority) {
        if (priority == null) return "MEDIUM";
        String upper = priority.toUpperCase();
        return Arrays.asList(PRIORITY_VALUES).contains(upper) ? upper : "MEDIUM";
    }

    private String validateStatus(String status) {
        if (status == null) return "IDENTIFIED";
        String upper = status.toUpperCase();
        return Arrays.asList(STATUS_VALUES).contains(upper) ? upper : "IDENTIFIED";
    }

    // =============================================
    // Utility Methods
    // =============================================

    private Resource writeWorkbookToResource(XSSFWorkbook workbook) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            workbook.write(baos);
            workbook.close();
            return new ByteArrayResource(baos.toByteArray());
        }
    }

    // =============================================
    // Inner Classes
    // =============================================

    private record ParseResult(List<RequirementRowData> rows, RequirementImportResult result) {}

    @lombok.Data
    private static class RequirementRowData {
        private int rowNum;
        private String code;
        private String title;
        private String description;
        private String category;
        private String priority;
        private String status;
        private Integer progress;
        private String sourceText;
        private Integer pageNumber;
        private String assigneeId;
        private LocalDate dueDate;
        private String acceptanceCriteria;
        private Integer storyPoints;
        private Integer estimatedHours;
        private Integer actualHours;
        private Integer remainingHours;
    }

    @lombok.Data
    public static class RequirementImportResult {
        private int totalRows;
        private int created;
        private int updated;
        private List<String> errors = new ArrayList<>();
        private List<String> warnings = new ArrayList<>();

        public void incrementCreated() { created++; }
        public void incrementUpdated() { updated++; }
        public void addError(String error) { errors.add(error); }
        public void addWarning(String warning) { warnings.add(warning); }

        public int getTotalProcessed() {
            return created + updated;
        }
    }
}
