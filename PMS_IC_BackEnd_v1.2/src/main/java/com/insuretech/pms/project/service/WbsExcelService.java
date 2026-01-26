package com.insuretech.pms.project.service;

import com.insuretech.pms.common.dto.ImportResult;
import com.insuretech.pms.common.service.ExcelService;
import com.insuretech.pms.project.entity.*;
import com.insuretech.pms.project.repository.*;
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
import java.util.*;

/**
 * Service for Excel import/export of WBS (Work Breakdown Structure).
 * Supports hierarchical structure: Phase -> WbsGroup -> WbsItem -> WbsTask
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WbsExcelService {

    private final PhaseRepository phaseRepository;
    private final WbsGroupRepository wbsGroupRepository;
    private final WbsItemRepository wbsItemRepository;
    private final WbsTaskRepository wbsTaskRepository;
    private final ExcelService excelService;

    // Column headers - using Phase ID since Phase entity doesn't have a code field
    private static final String[] HEADERS = {
        "레벨", "단계 ID", "그룹 코드", "항목 코드", "태스크 코드",
        "이름", "설명", "상태", "가중치", "순서",
        "계획 시작일", "계획 종료일", "예상 시간", "담당자 ID"
    };

    // Column indices
    private static final int COL_LEVEL = 0;
    private static final int COL_PHASE_ID = 1;
    private static final int COL_GROUP_CODE = 2;
    private static final int COL_ITEM_CODE = 3;
    private static final int COL_TASK_CODE = 4;
    private static final int COL_NAME = 5;
    private static final int COL_DESCRIPTION = 6;
    private static final int COL_STATUS = 7;
    private static final int COL_WEIGHT = 8;
    private static final int COL_ORDER = 9;
    private static final int COL_PLANNED_START = 10;
    private static final int COL_PLANNED_END = 11;
    private static final int COL_ESTIMATED_HOURS = 12;
    private static final int COL_ASSIGNEE_ID = 13;

    // Enum values
    private static final String[] LEVELS = {"GROUP", "ITEM", "TASK"};
    private static final String[] STATUSES = Arrays.stream(WbsGroup.WbsStatus.values())
            .map(Enum::name).toArray(String[]::new);

    /**
     * Generates an Excel template with headers, data validation, and sample data.
     */
    public byte[] generateTemplate(String projectId) throws IOException {
        List<Phase> phases = phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId);

        try (XSSFWorkbook workbook = excelService.createWorkbook()) {
            createInstructionsSheet(workbook, phases);

            Sheet dataSheet = workbook.createSheet("WBS Data");
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            CellStyle dateStyle = excelService.createDateStyle(workbook);

            excelService.createHeaderRow(dataSheet, HEADERS, headerStyle);
            excelService.addDropdownValidation(dataSheet, COL_LEVEL, LEVELS, 1, 1000);
            excelService.addDropdownValidation(dataSheet, COL_STATUS, STATUSES, 1, 1000);

            int rowNum = 1;
            String samplePhaseId = phases.isEmpty() ? "phase-001" : phases.get(0).getId();

            // Sample GROUP
            Row groupRow = dataSheet.createRow(rowNum++);
            createCell(groupRow, COL_LEVEL, "GROUP", dataStyle);
            createCell(groupRow, COL_PHASE_ID, samplePhaseId, dataStyle);
            createCell(groupRow, COL_GROUP_CODE, "1.1", dataStyle);
            createCell(groupRow, COL_ITEM_CODE, "", dataStyle);
            createCell(groupRow, COL_TASK_CODE, "", dataStyle);
            createCell(groupRow, COL_NAME, "예시 그룹: 요구사항 분석", dataStyle);
            createCell(groupRow, COL_DESCRIPTION, "요구사항 분석 및 문서화", dataStyle);
            createCell(groupRow, COL_STATUS, "NOT_STARTED", dataStyle);
            createCell(groupRow, COL_WEIGHT, 100, dataStyle);
            createCell(groupRow, COL_ORDER, 1, dataStyle);
            createDateCell(groupRow, COL_PLANNED_START, LocalDate.now(), dateStyle);
            createDateCell(groupRow, COL_PLANNED_END, LocalDate.now().plusWeeks(2), dateStyle);
            createCell(groupRow, COL_ESTIMATED_HOURS, "", dataStyle);
            createCell(groupRow, COL_ASSIGNEE_ID, "", dataStyle);

            // Sample ITEM
            Row itemRow = dataSheet.createRow(rowNum++);
            createCell(itemRow, COL_LEVEL, "ITEM", dataStyle);
            createCell(itemRow, COL_PHASE_ID, samplePhaseId, dataStyle);
            createCell(itemRow, COL_GROUP_CODE, "1.1", dataStyle);
            createCell(itemRow, COL_ITEM_CODE, "1.1.1", dataStyle);
            createCell(itemRow, COL_TASK_CODE, "", dataStyle);
            createCell(itemRow, COL_NAME, "예시 항목: 이해관계자 인터뷰", dataStyle);
            createCell(itemRow, COL_DESCRIPTION, "주요 이해관계자 인터뷰 수행", dataStyle);
            createCell(itemRow, COL_STATUS, "NOT_STARTED", dataStyle);
            createCell(itemRow, COL_WEIGHT, 100, dataStyle);
            createCell(itemRow, COL_ORDER, 1, dataStyle);
            createDateCell(itemRow, COL_PLANNED_START, LocalDate.now(), dateStyle);
            createDateCell(itemRow, COL_PLANNED_END, LocalDate.now().plusWeeks(1), dateStyle);
            createCell(itemRow, COL_ESTIMATED_HOURS, 40, dataStyle);
            createCell(itemRow, COL_ASSIGNEE_ID, "", dataStyle);

            // Sample TASK
            Row taskRow = dataSheet.createRow(rowNum++);
            createCell(taskRow, COL_LEVEL, "TASK", dataStyle);
            createCell(taskRow, COL_PHASE_ID, samplePhaseId, dataStyle);
            createCell(taskRow, COL_GROUP_CODE, "1.1", dataStyle);
            createCell(taskRow, COL_ITEM_CODE, "1.1.1", dataStyle);
            createCell(taskRow, COL_TASK_CODE, "1.1.1.1", dataStyle);
            createCell(taskRow, COL_NAME, "예시 태스크: 질문지 작성", dataStyle);
            createCell(taskRow, COL_DESCRIPTION, "인터뷰 질문 작성", dataStyle);
            createCell(taskRow, COL_STATUS, "NOT_STARTED", dataStyle);
            createCell(taskRow, COL_WEIGHT, 100, dataStyle);
            createCell(taskRow, COL_ORDER, 1, dataStyle);
            createDateCell(taskRow, COL_PLANNED_START, LocalDate.now(), dateStyle);
            createDateCell(taskRow, COL_PLANNED_END, LocalDate.now().plusDays(3), dateStyle);
            createCell(taskRow, COL_ESTIMATED_HOURS, 8, dataStyle);
            createCell(taskRow, COL_ASSIGNEE_ID, "", dataStyle);

            excelService.autoSizeColumns(dataSheet, HEADERS.length);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Exports WBS data for a project to Excel.
     */
    public byte[] exportWbs(String projectId) throws IOException {
        List<Phase> phases = phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId);

        try (XSSFWorkbook workbook = excelService.createWorkbook()) {
            createInstructionsSheet(workbook, phases);

            Sheet dataSheet = workbook.createSheet("WBS Data");
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            CellStyle dateStyle = excelService.createDateStyle(workbook);

            excelService.createHeaderRow(dataSheet, HEADERS, headerStyle);
            excelService.addDropdownValidation(dataSheet, COL_LEVEL, LEVELS, 1, 5000);
            excelService.addDropdownValidation(dataSheet, COL_STATUS, STATUSES, 1, 5000);

            int rowNum = 1;

            for (Phase phase : phases) {
                List<WbsGroup> groups = wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId());

                for (WbsGroup group : groups) {
                    Row groupRow = dataSheet.createRow(rowNum++);
                    exportGroupRow(groupRow, phase, group, dataStyle, dateStyle);

                    List<WbsItem> items = wbsItemRepository.findByGroupIdOrderByOrderNumAsc(group.getId());

                    for (WbsItem item : items) {
                        Row itemRow = dataSheet.createRow(rowNum++);
                        exportItemRow(itemRow, phase, group, item, dataStyle, dateStyle);

                        List<WbsTask> tasks = wbsTaskRepository.findByItemIdOrderByOrderNumAsc(item.getId());

                        for (WbsTask task : tasks) {
                            Row taskRow = dataSheet.createRow(rowNum++);
                            exportTaskRow(taskRow, phase, group, item, task, dataStyle, dateStyle);
                        }
                    }
                }
            }

            excelService.autoSizeColumns(dataSheet, HEADERS.length);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Exports WBS data for a specific phase.
     */
    public byte[] exportWbsByPhase(String phaseId) throws IOException {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> new RuntimeException("Phase not found: " + phaseId));

        try (XSSFWorkbook workbook = excelService.createWorkbook()) {
            createInstructionsSheet(workbook, List.of(phase));

            Sheet dataSheet = workbook.createSheet("WBS Data");
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            CellStyle dateStyle = excelService.createDateStyle(workbook);

            excelService.createHeaderRow(dataSheet, HEADERS, headerStyle);
            excelService.addDropdownValidation(dataSheet, COL_LEVEL, LEVELS, 1, 2000);
            excelService.addDropdownValidation(dataSheet, COL_STATUS, STATUSES, 1, 2000);

            int rowNum = 1;
            List<WbsGroup> groups = wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phaseId);

            for (WbsGroup group : groups) {
                Row groupRow = dataSheet.createRow(rowNum++);
                exportGroupRow(groupRow, phase, group, dataStyle, dateStyle);

                List<WbsItem> items = wbsItemRepository.findByGroupIdOrderByOrderNumAsc(group.getId());

                for (WbsItem item : items) {
                    Row itemRow = dataSheet.createRow(rowNum++);
                    exportItemRow(itemRow, phase, group, item, dataStyle, dateStyle);

                    List<WbsTask> tasks = wbsTaskRepository.findByItemIdOrderByOrderNumAsc(item.getId());

                    for (WbsTask task : tasks) {
                        Row taskRow = dataSheet.createRow(rowNum++);
                        exportTaskRow(taskRow, phase, group, item, task, dataStyle, dateStyle);
                    }
                }
            }

            excelService.autoSizeColumns(dataSheet, HEADERS.length);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Imports WBS data from Excel file.
     */
    @Transactional
    public ImportResult importWbs(String projectId, MultipartFile file) throws IOException {
        ImportResult result = new ImportResult();

        // Load phases for lookup
        List<Phase> phases = phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId);
        Map<String, Phase> phaseById = new HashMap<>();
        for (Phase phase : phases) {
            phaseById.put(phase.getId(), phase);
        }

        if (phaseById.isEmpty()) {
            result.addError(0, null, null, "No phases found for project. Please create phases first.");
            return result;
        }

        // Temporary storage for created entities
        Map<String, WbsGroup> createdGroups = new HashMap<>();
        Map<String, WbsItem> createdItems = new HashMap<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheet("WBS Data");
            if (sheet == null) {
                sheet = workbook.getSheetAt(0);
            }

            if (sheet == null) {
                result.addError(0, null, null, "Excel file has no sheets");
                return result;
            }

            int lastRowNum = sheet.getLastRowNum();
            log.info("Processing {} rows from WBS Excel for project {}", lastRowNum, projectId);

            // First pass: Process GROUPs
            for (int rowNum = 1; rowNum <= lastRowNum; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || excelService.isRowEmpty(row)) continue;

                String level = excelService.getCellStringValue(row.getCell(COL_LEVEL));
                if ("GROUP".equalsIgnoreCase(level)) {
                    result.setTotalRows(result.getTotalRows() + 1);
                    try {
                        processGroupRow(row, rowNum + 1, phaseById, createdGroups, result);
                    } catch (Exception e) {
                        log.error("Error processing GROUP at row {}: {}", rowNum + 1, e.getMessage());
                        result.addError(rowNum + 1, null, null, "Unexpected error: " + e.getMessage());
                    }
                }
            }

            // Second pass: Process ITEMs
            for (int rowNum = 1; rowNum <= lastRowNum; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || excelService.isRowEmpty(row)) continue;

                String level = excelService.getCellStringValue(row.getCell(COL_LEVEL));
                if ("ITEM".equalsIgnoreCase(level)) {
                    result.setTotalRows(result.getTotalRows() + 1);
                    try {
                        processItemRow(row, rowNum + 1, phaseById, createdGroups, createdItems, result);
                    } catch (Exception e) {
                        log.error("Error processing ITEM at row {}: {}", rowNum + 1, e.getMessage());
                        result.addError(rowNum + 1, null, null, "Unexpected error: " + e.getMessage());
                    }
                }
            }

            // Third pass: Process TASKs
            for (int rowNum = 1; rowNum <= lastRowNum; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || excelService.isRowEmpty(row)) continue;

                String level = excelService.getCellStringValue(row.getCell(COL_LEVEL));
                if ("TASK".equalsIgnoreCase(level)) {
                    result.setTotalRows(result.getTotalRows() + 1);
                    try {
                        processTaskRow(row, rowNum + 1, phaseById, createdGroups, createdItems, result);
                    } catch (Exception e) {
                        log.error("Error processing TASK at row {}: {}", rowNum + 1, e.getMessage());
                        result.addError(rowNum + 1, null, null, "Unexpected error: " + e.getMessage());
                    }
                }
            }
        }

        log.info("WBS Import completed for project {}: {}", projectId, result.getSummary());
        return result;
    }

    // =============================================
    // Private Helper Methods
    // =============================================

    private void createInstructionsSheet(XSSFWorkbook workbook, List<Phase> phases) {
        Sheet sheet = workbook.createSheet("안내");
        CellStyle boldStyle = workbook.createCellStyle();
        Font boldFont = workbook.createFont();
        boldFont.setBold(true);
        boldStyle.setFont(boldFont);

        int row = 0;
        sheet.createRow(row++).createCell(0).setCellValue("WBS 가져오기/내보내기 안내");
        sheet.getRow(row - 1).getCell(0).setCellStyle(boldStyle);
        row++;

        sheet.createRow(row++).createCell(0).setCellValue("계층 구조: 단계(Phase) -> 그룹(GROUP) -> 항목(ITEM) -> 태스크(TASK)");
        row++;

        sheet.createRow(row++).createCell(0).setCellValue("사용 가능한 단계:");
        sheet.getRow(row - 1).getCell(0).setCellStyle(boldStyle);
        for (Phase phase : phases) {
            Row r = sheet.createRow(row++);
            r.createCell(0).setCellValue("  - ID: " + phase.getId() + ", 이름: " + phase.getName());
        }
        row++;

        sheet.createRow(row++).createCell(0).setCellValue("레벨 컬럼:");
        sheet.getRow(row - 1).getCell(0).setCellStyle(boldStyle);
        sheet.createRow(row++).createCell(0).setCellValue("  GROUP - WBS 그룹 (2단계)");
        sheet.createRow(row++).createCell(0).setCellValue("  ITEM - WBS 항목/작업 패키지 (3단계)");
        sheet.createRow(row++).createCell(0).setCellValue("  TASK - WBS 태스크/작업 (4단계)");
        row++;

        sheet.createRow(row++).createCell(0).setCellValue("상태 값:");
        sheet.getRow(row - 1).getCell(0).setCellStyle(boldStyle);
        sheet.createRow(row++).createCell(0).setCellValue("  NOT_STARTED(미시작), IN_PROGRESS(진행중), COMPLETED(완료), ON_HOLD(보류), CANCELLED(취소)");
        row++;

        sheet.createRow(row++).createCell(0).setCellValue("가져오기 규칙:");
        sheet.getRow(row - 1).getCell(0).setCellStyle(boldStyle);
        sheet.createRow(row++).createCell(0).setCellValue("  - 단계 ID + 그룹 코드가 존재하면 그룹이 업데이트됩니다");
        sheet.createRow(row++).createCell(0).setCellValue("  - 그룹 코드 + 항목 코드가 존재하면 항목이 업데이트됩니다");
        sheet.createRow(row++).createCell(0).setCellValue("  - 항목 코드 + 태스크 코드가 존재하면 태스크가 업데이트됩니다");
        sheet.createRow(row++).createCell(0).setCellValue("  - 해당하지 않으면 신규 항목이 생성됩니다");

        sheet.setColumnWidth(0, 20000);
    }

    private void exportGroupRow(Row row, Phase phase, WbsGroup group, CellStyle dataStyle, CellStyle dateStyle) {
        createCell(row, COL_LEVEL, "GROUP", dataStyle);
        createCell(row, COL_PHASE_ID, phase.getId(), dataStyle);
        createCell(row, COL_GROUP_CODE, group.getCode(), dataStyle);
        createCell(row, COL_ITEM_CODE, "", dataStyle);
        createCell(row, COL_TASK_CODE, "", dataStyle);
        createCell(row, COL_NAME, group.getName(), dataStyle);
        createCell(row, COL_DESCRIPTION, group.getDescription(), dataStyle);
        createCell(row, COL_STATUS, group.getStatus() != null ? group.getStatus().name() : "", dataStyle);
        createCell(row, COL_WEIGHT, group.getWeight(), dataStyle);
        createCell(row, COL_ORDER, group.getOrderNum(), dataStyle);
        createDateCell(row, COL_PLANNED_START, group.getPlannedStartDate(), dateStyle);
        createDateCell(row, COL_PLANNED_END, group.getPlannedEndDate(), dateStyle);
        createCell(row, COL_ESTIMATED_HOURS, "", dataStyle);
        createCell(row, COL_ASSIGNEE_ID, "", dataStyle);
    }

    private void exportItemRow(Row row, Phase phase, WbsGroup group, WbsItem item, CellStyle dataStyle, CellStyle dateStyle) {
        createCell(row, COL_LEVEL, "ITEM", dataStyle);
        createCell(row, COL_PHASE_ID, phase.getId(), dataStyle);
        createCell(row, COL_GROUP_CODE, group.getCode(), dataStyle);
        createCell(row, COL_ITEM_CODE, item.getCode(), dataStyle);
        createCell(row, COL_TASK_CODE, "", dataStyle);
        createCell(row, COL_NAME, item.getName(), dataStyle);
        createCell(row, COL_DESCRIPTION, item.getDescription(), dataStyle);
        createCell(row, COL_STATUS, item.getStatus() != null ? item.getStatus().name() : "", dataStyle);
        createCell(row, COL_WEIGHT, item.getWeight(), dataStyle);
        createCell(row, COL_ORDER, item.getOrderNum(), dataStyle);
        createDateCell(row, COL_PLANNED_START, item.getPlannedStartDate(), dateStyle);
        createDateCell(row, COL_PLANNED_END, item.getPlannedEndDate(), dateStyle);
        createCell(row, COL_ESTIMATED_HOURS, item.getEstimatedHours(), dataStyle);
        createCell(row, COL_ASSIGNEE_ID, item.getAssigneeId(), dataStyle);
    }

    private void exportTaskRow(Row row, Phase phase, WbsGroup group, WbsItem item, WbsTask task, CellStyle dataStyle, CellStyle dateStyle) {
        createCell(row, COL_LEVEL, "TASK", dataStyle);
        createCell(row, COL_PHASE_ID, phase.getId(), dataStyle);
        createCell(row, COL_GROUP_CODE, group.getCode(), dataStyle);
        createCell(row, COL_ITEM_CODE, item.getCode(), dataStyle);
        createCell(row, COL_TASK_CODE, task.getCode(), dataStyle);
        createCell(row, COL_NAME, task.getName(), dataStyle);
        createCell(row, COL_DESCRIPTION, task.getDescription(), dataStyle);
        createCell(row, COL_STATUS, task.getStatus() != null ? task.getStatus().name() : "", dataStyle);
        createCell(row, COL_WEIGHT, task.getWeight(), dataStyle);
        createCell(row, COL_ORDER, task.getOrderNum(), dataStyle);
        createCell(row, COL_PLANNED_START, "", dataStyle);
        createCell(row, COL_PLANNED_END, "", dataStyle);
        createCell(row, COL_ESTIMATED_HOURS, task.getEstimatedHours(), dataStyle);
        createCell(row, COL_ASSIGNEE_ID, task.getAssigneeId(), dataStyle);
    }

    private void processGroupRow(Row row, int rowNumber, Map<String, Phase> phaseById,
                                  Map<String, WbsGroup> createdGroups, ImportResult result) {
        String phaseId = excelService.getCellStringValue(row.getCell(COL_PHASE_ID));
        String groupCode = excelService.getCellStringValue(row.getCell(COL_GROUP_CODE));
        String name = excelService.getCellStringValue(row.getCell(COL_NAME));

        if (phaseId == null || phaseId.isEmpty()) {
            result.addError(rowNumber, "Phase ID", null, "Phase ID is required for GROUP");
            return;
        }
        if (groupCode == null || groupCode.isEmpty()) {
            result.addError(rowNumber, "Group Code", null, "Group Code is required for GROUP");
            return;
        }
        if (name == null || name.isEmpty()) {
            result.addError(rowNumber, "Name", null, "Name is required");
            return;
        }

        Phase phase = phaseById.get(phaseId);
        if (phase == null) {
            result.addError(rowNumber, "Phase ID", phaseId, "Phase not found");
            return;
        }

        String description = excelService.getCellStringValue(row.getCell(COL_DESCRIPTION));
        WbsGroup.WbsStatus status = parseStatus(excelService.getCellStringValue(row.getCell(COL_STATUS)));
        Integer weight = excelService.getCellIntegerValue(row.getCell(COL_WEIGHT));
        Integer orderNum = excelService.getCellIntegerValue(row.getCell(COL_ORDER));
        LocalDate plannedStart = excelService.getCellDateValue(row.getCell(COL_PLANNED_START));
        LocalDate plannedEnd = excelService.getCellDateValue(row.getCell(COL_PLANNED_END));

        Optional<WbsGroup> existingOpt = wbsGroupRepository.findByPhaseIdAndCode(phase.getId(), groupCode);

        if (existingOpt.isPresent()) {
            WbsGroup existing = existingOpt.get();
            existing.setName(name);
            if (description != null) existing.setDescription(description);
            if (status != null) existing.setStatus(status);
            if (weight != null) existing.setWeight(weight);
            if (orderNum != null) existing.setOrderNum(orderNum);
            if (plannedStart != null) existing.setPlannedStartDate(plannedStart);
            if (plannedEnd != null) existing.setPlannedEndDate(plannedEnd);

            wbsGroupRepository.save(existing);
            createdGroups.put(phaseId + ":" + groupCode, existing);
            result.incrementUpdate();
            log.debug("Updated WBS Group {} at row {}", groupCode, rowNumber);
        } else {
            WbsGroup newGroup = WbsGroup.builder()
                    .phase(phase)
                    .code(groupCode)
                    .name(name)
                    .description(description)
                    .status(status != null ? status : WbsGroup.WbsStatus.NOT_STARTED)
                    .weight(weight != null ? weight : 100)
                    .orderNum(orderNum != null ? orderNum : 0)
                    .plannedStartDate(plannedStart)
                    .plannedEndDate(plannedEnd)
                    .build();

            wbsGroupRepository.save(newGroup);
            createdGroups.put(phaseId + ":" + groupCode, newGroup);
            result.incrementCreate();
            log.debug("Created WBS Group {} at row {}", groupCode, rowNumber);
        }
    }

    private void processItemRow(Row row, int rowNumber, Map<String, Phase> phaseById,
                                 Map<String, WbsGroup> createdGroups, Map<String, WbsItem> createdItems,
                                 ImportResult result) {
        String phaseId = excelService.getCellStringValue(row.getCell(COL_PHASE_ID));
        String groupCode = excelService.getCellStringValue(row.getCell(COL_GROUP_CODE));
        String itemCode = excelService.getCellStringValue(row.getCell(COL_ITEM_CODE));
        String name = excelService.getCellStringValue(row.getCell(COL_NAME));

        if (groupCode == null || groupCode.isEmpty()) {
            result.addError(rowNumber, "Group Code", null, "Group Code is required for ITEM");
            return;
        }
        if (itemCode == null || itemCode.isEmpty()) {
            result.addError(rowNumber, "Item Code", null, "Item Code is required for ITEM");
            return;
        }
        if (name == null || name.isEmpty()) {
            result.addError(rowNumber, "Name", null, "Name is required");
            return;
        }

        String groupKey = phaseId + ":" + groupCode;
        WbsGroup group = createdGroups.get(groupKey);
        if (group == null) {
            Phase phase = phaseById.get(phaseId);
            if (phase != null) {
                group = wbsGroupRepository.findByPhaseIdAndCode(phase.getId(), groupCode).orElse(null);
            }
        }

        if (group == null) {
            result.addError(rowNumber, "Group Code", groupCode, "Parent Group not found. Create GROUP first.");
            return;
        }

        String description = excelService.getCellStringValue(row.getCell(COL_DESCRIPTION));
        WbsGroup.WbsStatus status = parseStatus(excelService.getCellStringValue(row.getCell(COL_STATUS)));
        Integer weight = excelService.getCellIntegerValue(row.getCell(COL_WEIGHT));
        Integer orderNum = excelService.getCellIntegerValue(row.getCell(COL_ORDER));
        LocalDate plannedStart = excelService.getCellDateValue(row.getCell(COL_PLANNED_START));
        LocalDate plannedEnd = excelService.getCellDateValue(row.getCell(COL_PLANNED_END));
        Integer estimatedHours = excelService.getCellIntegerValue(row.getCell(COL_ESTIMATED_HOURS));
        String assigneeId = excelService.getCellStringValue(row.getCell(COL_ASSIGNEE_ID));

        Optional<WbsItem> existingOpt = wbsItemRepository.findByGroupIdAndCode(group.getId(), itemCode);

        if (existingOpt.isPresent()) {
            WbsItem existing = existingOpt.get();
            existing.setName(name);
            if (description != null) existing.setDescription(description);
            if (status != null) existing.setStatus(status);
            if (weight != null) existing.setWeight(weight);
            if (orderNum != null) existing.setOrderNum(orderNum);
            if (plannedStart != null) existing.setPlannedStartDate(plannedStart);
            if (plannedEnd != null) existing.setPlannedEndDate(plannedEnd);
            if (estimatedHours != null) existing.setEstimatedHours(estimatedHours);
            if (assigneeId != null && !assigneeId.isEmpty()) existing.setAssigneeId(assigneeId);

            wbsItemRepository.save(existing);
            createdItems.put(groupCode + ":" + itemCode, existing);
            result.incrementUpdate();
            log.debug("Updated WBS Item {} at row {}", itemCode, rowNumber);
        } else {
            WbsItem newItem = WbsItem.builder()
                    .group(group)
                    .phase(group.getPhase())
                    .code(itemCode)
                    .name(name)
                    .description(description)
                    .status(status != null ? status : WbsGroup.WbsStatus.NOT_STARTED)
                    .weight(weight != null ? weight : 100)
                    .orderNum(orderNum != null ? orderNum : 0)
                    .plannedStartDate(plannedStart)
                    .plannedEndDate(plannedEnd)
                    .estimatedHours(estimatedHours)
                    .assigneeId(assigneeId)
                    .build();

            wbsItemRepository.save(newItem);
            createdItems.put(groupCode + ":" + itemCode, newItem);
            result.incrementCreate();
            log.debug("Created WBS Item {} at row {}", itemCode, rowNumber);
        }
    }

    private void processTaskRow(Row row, int rowNumber, Map<String, Phase> phaseById,
                                 Map<String, WbsGroup> createdGroups, Map<String, WbsItem> createdItems,
                                 ImportResult result) {
        String phaseId = excelService.getCellStringValue(row.getCell(COL_PHASE_ID));
        String groupCode = excelService.getCellStringValue(row.getCell(COL_GROUP_CODE));
        String itemCode = excelService.getCellStringValue(row.getCell(COL_ITEM_CODE));
        String taskCode = excelService.getCellStringValue(row.getCell(COL_TASK_CODE));
        String name = excelService.getCellStringValue(row.getCell(COL_NAME));

        if (itemCode == null || itemCode.isEmpty()) {
            result.addError(rowNumber, "Item Code", null, "Item Code is required for TASK");
            return;
        }
        if (taskCode == null || taskCode.isEmpty()) {
            result.addError(rowNumber, "Task Code", null, "Task Code is required for TASK");
            return;
        }
        if (name == null || name.isEmpty()) {
            result.addError(rowNumber, "Name", null, "Name is required");
            return;
        }

        String itemKey = groupCode + ":" + itemCode;
        WbsItem item = createdItems.get(itemKey);
        if (item == null) {
            String groupKey = phaseId + ":" + groupCode;
            WbsGroup group = createdGroups.get(groupKey);

            if (group == null) {
                Phase phase = phaseById.get(phaseId);
                if (phase != null) {
                    group = wbsGroupRepository.findByPhaseIdAndCode(phase.getId(), groupCode).orElse(null);
                }
            }

            if (group != null) {
                item = wbsItemRepository.findByGroupIdAndCode(group.getId(), itemCode).orElse(null);
            }
        }

        if (item == null) {
            result.addError(rowNumber, "Item Code", itemCode, "Parent Item not found. Create ITEM first.");
            return;
        }

        String description = excelService.getCellStringValue(row.getCell(COL_DESCRIPTION));
        WbsGroup.WbsStatus status = parseStatus(excelService.getCellStringValue(row.getCell(COL_STATUS)));
        Integer weight = excelService.getCellIntegerValue(row.getCell(COL_WEIGHT));
        Integer orderNum = excelService.getCellIntegerValue(row.getCell(COL_ORDER));
        Integer estimatedHours = excelService.getCellIntegerValue(row.getCell(COL_ESTIMATED_HOURS));
        String assigneeId = excelService.getCellStringValue(row.getCell(COL_ASSIGNEE_ID));

        Optional<WbsTask> existingOpt = wbsTaskRepository.findByItemIdAndCode(item.getId(), taskCode);

        if (existingOpt.isPresent()) {
            WbsTask existing = existingOpt.get();
            existing.setName(name);
            if (description != null) existing.setDescription(description);
            if (status != null) existing.setStatus(status);
            if (weight != null) existing.setWeight(weight);
            if (orderNum != null) existing.setOrderNum(orderNum);
            if (estimatedHours != null) existing.setEstimatedHours(estimatedHours);
            if (assigneeId != null && !assigneeId.isEmpty()) existing.setAssigneeId(assigneeId);

            wbsTaskRepository.save(existing);
            result.incrementUpdate();
            log.debug("Updated WBS Task {} at row {}", taskCode, rowNumber);
        } else {
            WbsTask newTask = WbsTask.builder()
                    .item(item)
                    .group(item.getGroup())
                    .phase(item.getPhase())
                    .code(taskCode)
                    .name(name)
                    .description(description)
                    .status(status != null ? status : WbsGroup.WbsStatus.NOT_STARTED)
                    .weight(weight != null ? weight : 100)
                    .orderNum(orderNum != null ? orderNum : 0)
                    .estimatedHours(estimatedHours)
                    .assigneeId(assigneeId)
                    .build();

            wbsTaskRepository.save(newTask);
            result.incrementCreate();
            log.debug("Created WBS Task {} at row {}", taskCode, rowNumber);
        }
    }

    private WbsGroup.WbsStatus parseStatus(String statusStr) {
        if (statusStr == null || statusStr.isEmpty()) {
            return null;
        }
        try {
            return WbsGroup.WbsStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private void createCell(Row row, int column, Object value, CellStyle style) {
        Cell cell = row.createCell(column);
        excelService.setCellValue(cell, value, style);
    }

    private void createDateCell(Row row, int column, LocalDate date, CellStyle style) {
        Cell cell = row.createCell(column);
        if (date != null) {
            cell.setCellValue(java.sql.Date.valueOf(date));
        }
        cell.setCellStyle(style);
    }
}
