package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.dto.ImportResult;
import com.insuretech.pms.common.service.ExcelService;
import com.insuretech.pms.rfp.entity.*;
import com.insuretech.pms.rfp.repository.RequirementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Service for Excel import/export of Requirements.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RequirementExcelService {

    private final RequirementRepository requirementRepository;
    private final RequirementService requirementService;
    private final ExcelService excelService;

    // Column headers for the Excel template
    private static final String[] HEADERS = {
        "코드", "제목", "설명", "유형", "우선순위", "상태",
        "인수 기준", "담당자 ID", "마감일", "예상 공수(시간)", "스토리 포인트"
    };

    // Column indices
    private static final int COL_CODE = 0;
    private static final int COL_TITLE = 1;
    private static final int COL_DESCRIPTION = 2;
    private static final int COL_CATEGORY = 3;
    private static final int COL_PRIORITY = 4;
    private static final int COL_STATUS = 5;
    private static final int COL_ACCEPTANCE_CRITERIA = 6;
    private static final int COL_ASSIGNEE_ID = 7;
    private static final int COL_DUE_DATE = 8;
    private static final int COL_ESTIMATED_EFFORT = 9;
    private static final int COL_STORY_POINTS = 10;

    // Enum values for dropdowns
    private static final String[] CATEGORIES = Arrays.stream(RequirementCategory.values())
            .map(Enum::name).toArray(String[]::new);
    private static final String[] PRIORITIES = Arrays.stream(Priority.values())
            .map(Enum::name).toArray(String[]::new);
    private static final String[] STATUSES = Arrays.stream(RequirementStatus.values())
            .map(Enum::name).toArray(String[]::new);

    /**
     * Generates an empty Excel template with headers and data validation.
     */
    public byte[] generateTemplate(String projectId) throws IOException {
        try (XSSFWorkbook workbook = excelService.createWorkbook()) {
            Sheet sheet = workbook.createSheet("Requirements");

            // Create styles
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            CellStyle dateStyle = excelService.createDateStyle(workbook);

            // Create header row
            excelService.createHeaderRow(sheet, HEADERS, headerStyle);

            // Add dropdown validations (for rows 2-1001)
            excelService.addDropdownValidation(sheet, COL_CATEGORY, CATEGORIES, 1, 1000);
            excelService.addDropdownValidation(sheet, COL_PRIORITY, PRIORITIES, 1, 1000);
            excelService.addDropdownValidation(sheet, COL_STATUS, STATUSES, 1, 1000);

            // Add sample row for guidance
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            Row sampleRow = sheet.createRow(1);

            createCell(sampleRow, COL_CODE, "", dataStyle);
            createCell(sampleRow, COL_TITLE, "예시: 사용자 인증 기능", dataStyle);
            createCell(sampleRow, COL_DESCRIPTION, "OAuth2 기반 인증 구현", dataStyle);
            createCell(sampleRow, COL_CATEGORY, "FUNCTIONAL", dataStyle);
            createCell(sampleRow, COL_PRIORITY, "HIGH", dataStyle);
            createCell(sampleRow, COL_STATUS, "IDENTIFIED", dataStyle);
            createCell(sampleRow, COL_ACCEPTANCE_CRITERIA, "Google/GitHub으로 로그인 가능", dataStyle);
            createCell(sampleRow, COL_ASSIGNEE_ID, "", dataStyle);

            Cell dateCell = sampleRow.createCell(COL_DUE_DATE);
            dateCell.setCellValue(java.sql.Date.valueOf(LocalDate.now().plusMonths(1)));
            dateCell.setCellStyle(dateStyle);

            createCell(sampleRow, COL_ESTIMATED_EFFORT, 40, dataStyle);
            createCell(sampleRow, COL_STORY_POINTS, 8, dataStyle);

            // Auto-size columns
            excelService.autoSizeColumns(sheet, HEADERS.length);

            // Write to byte array
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Exports existing requirements to Excel.
     */
    public byte[] exportRequirements(String projectId) throws IOException {
        List<Requirement> requirements = requirementRepository.findByProjectIdOrderByCodeAsc(projectId);

        try (XSSFWorkbook workbook = excelService.createWorkbook()) {
            Sheet sheet = workbook.createSheet("Requirements");

            // Create styles
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            CellStyle dateStyle = excelService.createDateStyle(workbook);

            // Create header row
            excelService.createHeaderRow(sheet, HEADERS, headerStyle);

            // Add dropdown validations
            excelService.addDropdownValidation(sheet, COL_CATEGORY, CATEGORIES, 1, Math.max(requirements.size() + 100, 1000));
            excelService.addDropdownValidation(sheet, COL_PRIORITY, PRIORITIES, 1, Math.max(requirements.size() + 100, 1000));
            excelService.addDropdownValidation(sheet, COL_STATUS, STATUSES, 1, Math.max(requirements.size() + 100, 1000));

            // Create data rows
            int rowNum = 1;
            for (Requirement req : requirements) {
                Row row = sheet.createRow(rowNum++);

                createCell(row, COL_CODE, req.getCode(), dataStyle);
                createCell(row, COL_TITLE, req.getTitle(), dataStyle);
                createCell(row, COL_DESCRIPTION, req.getDescription(), dataStyle);
                createCell(row, COL_CATEGORY, req.getCategory() != null ? req.getCategory().name() : "", dataStyle);
                createCell(row, COL_PRIORITY, req.getPriority() != null ? req.getPriority().name() : "", dataStyle);
                createCell(row, COL_STATUS, req.getStatus() != null ? req.getStatus().name() : "", dataStyle);
                createCell(row, COL_ACCEPTANCE_CRITERIA, req.getAcceptanceCriteria(), dataStyle);
                createCell(row, COL_ASSIGNEE_ID, req.getAssigneeId(), dataStyle);

                Cell dateCell = row.createCell(COL_DUE_DATE);
                if (req.getDueDate() != null) {
                    dateCell.setCellValue(java.sql.Date.valueOf(req.getDueDate()));
                }
                dateCell.setCellStyle(dateStyle);

                createCell(row, COL_ESTIMATED_EFFORT, req.getEstimatedEffort(), dataStyle);
                createCell(row, COL_STORY_POINTS, req.getStoryPoints(), dataStyle);
            }

            // Auto-size columns
            excelService.autoSizeColumns(sheet, HEADERS.length);

            // Write to byte array
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Imports requirements from Excel file.
     * - If Code exists: UPDATE the existing requirement
     * - If Code is empty: CREATE a new requirement
     */
    @Transactional
    public ImportResult importRequirements(String projectId, MultipartFile file) throws IOException {
        ImportResult result = ImportResult.builder()
                .totalRows(0)
                .successCount(0)
                .createCount(0)
                .updateCount(0)
                .errorCount(0)
                .build();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            if (sheet == null) {
                result.addError(0, null, null, "Excel file has no sheets");
                return result;
            }

            int lastRowNum = sheet.getLastRowNum();
            log.info("Processing {} rows from Excel file for project {}", lastRowNum, projectId);

            // Start from row 1 (skip header)
            for (int rowNum = 1; rowNum <= lastRowNum; rowNum++) {
                Row row = sheet.getRow(rowNum);

                // Skip empty rows
                if (row == null || excelService.isRowEmpty(row)) {
                    continue;
                }

                result.setTotalRows(result.getTotalRows() + 1);

                try {
                    processRow(projectId, row, rowNum + 1, result);
                } catch (Exception e) {
                    log.error("Error processing row {}: {}", rowNum + 1, e.getMessage());
                    result.addError(rowNum + 1, null, null, "Unexpected error: " + e.getMessage());
                }
            }
        }

        log.info("Import completed for project {}: {}", projectId, result.getSummary());
        return result;
    }

    private void processRow(String projectId, Row row, int rowNumber, ImportResult result) {
        // Read cell values
        String code = excelService.getCellStringValue(row.getCell(COL_CODE));
        String title = excelService.getCellStringValue(row.getCell(COL_TITLE));
        String description = excelService.getCellStringValue(row.getCell(COL_DESCRIPTION));
        String categoryStr = excelService.getCellStringValue(row.getCell(COL_CATEGORY));
        String priorityStr = excelService.getCellStringValue(row.getCell(COL_PRIORITY));
        String statusStr = excelService.getCellStringValue(row.getCell(COL_STATUS));
        String acceptanceCriteria = excelService.getCellStringValue(row.getCell(COL_ACCEPTANCE_CRITERIA));
        String assigneeId = excelService.getCellStringValue(row.getCell(COL_ASSIGNEE_ID));
        LocalDate dueDate = excelService.getCellDateValue(row.getCell(COL_DUE_DATE));
        Integer estimatedEffort = excelService.getCellIntegerValue(row.getCell(COL_ESTIMATED_EFFORT));
        Integer storyPoints = excelService.getCellIntegerValue(row.getCell(COL_STORY_POINTS));

        // Validate required fields
        if (title == null || title.trim().isEmpty()) {
            result.addError(rowNumber, "Title", null, "Title is required");
            return;
        }

        // Validate and parse category
        RequirementCategory category = null;
        if (categoryStr != null && !categoryStr.isEmpty()) {
            try {
                category = RequirementCategory.valueOf(categoryStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                result.addError(rowNumber, "Category", categoryStr,
                    "Invalid category. Valid values: " + String.join(", ", CATEGORIES));
                return;
            }
        }

        // Validate and parse priority
        Priority priority = null;
        if (priorityStr != null && !priorityStr.isEmpty()) {
            try {
                priority = Priority.valueOf(priorityStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                result.addError(rowNumber, "Priority", priorityStr,
                    "Invalid priority. Valid values: " + String.join(", ", PRIORITIES));
                return;
            }
        }

        // Validate and parse status
        RequirementStatus status = null;
        if (statusStr != null && !statusStr.isEmpty()) {
            try {
                status = RequirementStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                result.addError(rowNumber, "Status", statusStr,
                    "Invalid status. Valid values: " + String.join(", ", STATUSES));
                return;
            }
        }

        // Check if updating existing or creating new
        if (code != null && !code.isEmpty()) {
            // Update existing requirement
            Optional<Requirement> existingOpt = requirementRepository.findByCode(code);
            if (existingOpt.isEmpty()) {
                result.addError(rowNumber, "Code", code, "Requirement with this code not found");
                return;
            }

            Requirement existing = existingOpt.get();
            if (!existing.getProjectId().equals(projectId)) {
                result.addError(rowNumber, "Code", code, "Requirement belongs to a different project");
                return;
            }

            // Update fields
            existing.setTitle(title);
            if (description != null) existing.setDescription(description);
            if (category != null) existing.setCategory(category);
            if (priority != null) existing.setPriority(priority);
            if (status != null) existing.setStatus(status);
            if (acceptanceCriteria != null) existing.setAcceptanceCriteria(acceptanceCriteria);
            if (assigneeId != null && !assigneeId.isEmpty()) existing.setAssigneeId(assigneeId);
            if (dueDate != null) existing.setDueDate(dueDate);
            if (estimatedEffort != null) existing.setEstimatedEffort(estimatedEffort);
            if (storyPoints != null) existing.setStoryPoints(storyPoints);

            requirementRepository.save(existing);
            result.incrementUpdate();
            log.debug("Updated requirement {} at row {}", code, rowNumber);

        } else {
            // Create new requirement
            Requirement newReq = Requirement.builder()
                    .projectId(projectId)
                    .code(generateRequirementCode(projectId, category != null ? category.name() : "FUNCTIONAL"))
                    .title(title)
                    .description(description)
                    .category(category != null ? category : RequirementCategory.FUNCTIONAL)
                    .priority(priority != null ? priority : Priority.MEDIUM)
                    .status(status != null ? status : RequirementStatus.IDENTIFIED)
                    .acceptanceCriteria(acceptanceCriteria)
                    .assigneeId(assigneeId)
                    .dueDate(dueDate)
                    .estimatedEffort(estimatedEffort)
                    .storyPoints(storyPoints)
                    .tenantId(projectId)
                    .build();

            requirementRepository.save(newReq);
            result.incrementCreate();
            log.debug("Created new requirement {} at row {}", newReq.getCode(), rowNumber);
        }
    }

    private String generateRequirementCode(String projectId, String category) {
        String categoryCode = getCategoryCode(category);
        String prefix = "REQ-" + projectId.substring(0, Math.min(4, projectId.length())).toUpperCase()
                + "-" + categoryCode + "-";

        Integer maxNum = requirementRepository.findMaxCodeNumber(projectId, prefix);
        int nextNum = (maxNum != null ? maxNum : 0) + 1;

        return prefix + String.format("%03d", nextNum);
    }

    private String getCategoryCode(String category) {
        if (category == null) return "FUNC";
        return switch (category) {
            case "FUNCTIONAL" -> "FUNC";
            case "NON_FUNCTIONAL" -> "NFUNC";
            case "UI" -> "UI";
            case "INTEGRATION" -> "INT";
            case "SECURITY" -> "SEC";
            case "AI" -> "AI";
            case "SI" -> "SI";
            case "COMMON" -> "COM";
            case "TECHNICAL" -> "TECH";
            case "BUSINESS" -> "BIZ";
            case "CONSTRAINT" -> "CONS";
            default -> "FUNC";
        };
    }

    private void createCell(Row row, int column, Object value, CellStyle style) {
        Cell cell = row.createCell(column);
        excelService.setCellValue(cell, value, style);
    }
}
