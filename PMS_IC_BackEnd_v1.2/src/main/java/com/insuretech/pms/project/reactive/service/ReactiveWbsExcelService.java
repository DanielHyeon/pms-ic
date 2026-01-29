package com.insuretech.pms.project.reactive.service;

import com.insuretech.pms.common.service.ExcelService;
import com.insuretech.pms.project.reactive.entity.R2dbcPhase;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsGroup;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsItem;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsTask;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsGroupRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

/**
 * Reactive WBS Excel Service for import/export operations.
 * Provides functionality to export WBS data to Excel and import from Excel templates.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveWbsExcelService {

    private final ExcelService excelService;
    private final ReactivePhaseRepository phaseRepository;
    private final ReactiveWbsGroupRepository wbsGroupRepository;
    private final ReactiveWbsItemRepository wbsItemRepository;
    private final ReactiveWbsTaskRepository wbsTaskRepository;

    // Excel column headers for WBS export
    private static final String[] WBS_HEADERS = {
            "Level", "Phase", "Group Code", "Group Name", "Item Code", "Item Name",
            "Task Code", "Task Name", "Description", "Status", "Progress (%)",
            "Planned Start", "Planned End", "Actual Start", "Actual End",
            "Estimated Hours", "Actual Hours", "Assignee ID", "Weight"
    };

    private static final String[] STATUS_VALUES = {
            "NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"
    };

    /**
     * Export WBS data to Excel workbook for a project.
     *
     * @param projectId Project ID
     * @return Mono<Resource> containing the Excel file
     */
    public Mono<Resource> exportToExcel(String projectId) {
        return Mono.defer(() -> {
            log.info("Starting WBS export for project: {}", projectId);

            return collectWbsData(projectId)
                    .flatMap(this::generateExcelWorkbook)
                    .subscribeOn(Schedulers.boundedElastic());
        });
    }

    /**
     * Generate a blank WBS template with headers and validations.
     *
     * @return Mono<Resource> containing the template Excel file
     */
    public Mono<Resource> generateTemplate() {
        return Mono.fromCallable(() -> {
            log.info("Generating WBS Excel template");

            XSSFWorkbook workbook = excelService.createWorkbook();
            Sheet sheet = workbook.createSheet("WBS Template");

            // Create header style and row
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            excelService.createHeaderRow(sheet, WBS_HEADERS, headerStyle);

            // Add dropdown validations
            excelService.addDropdownValidation(sheet, 0, new String[]{"PHASE", "GROUP", "ITEM", "TASK"}, 1, 1000);
            excelService.addDropdownValidation(sheet, 9, STATUS_VALUES, 1, 1000);

            // Create sample rows with instructions
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            createInstructionRows(sheet, dataStyle);

            // Auto-size columns
            excelService.autoSizeColumns(sheet, WBS_HEADERS.length);

            // Add instruction sheet
            addInstructionSheet(workbook);

            return writeWorkbookToResource(workbook);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Import WBS data from Excel file.
     *
     * @param filePart Uploaded file
     * @param projectId Project ID
     * @return Mono<WbsImportResult> with import statistics
     */
    public Mono<WbsImportResult> importFromExcel(FilePart filePart, String projectId) {
        return DataBufferUtils.join(filePart.content())
                .flatMap(dataBuffer -> {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    DataBufferUtils.release(dataBuffer);

                    return parseAndImportWbs(bytes, projectId);
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Import WBS data from byte array.
     *
     * @param fileBytes Excel file bytes
     * @param projectId Project ID
     * @return Mono<WbsImportResult> with import statistics
     */
    public Mono<WbsImportResult> importFromBytes(byte[] fileBytes, String projectId) {
        return parseAndImportWbs(fileBytes, projectId)
                .subscribeOn(Schedulers.boundedElastic());
    }

    // =============================================
    // Private Export Methods
    // =============================================

    private Mono<WbsExportData> collectWbsData(String projectId) {
        return phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId)
                .collectList()
                .flatMap(phases -> {
                    if (phases.isEmpty()) {
                        return Mono.just(new WbsExportData(phases, List.of(), List.of(), List.of()));
                    }

                    return Mono.zip(
                            Mono.just(phases),
                            wbsGroupRepository.findByProjectIdOrdered(projectId).collectList(),
                            wbsItemRepository.findByProjectIdOrdered(projectId).collectList(),
                            wbsTaskRepository.findByProjectIdOrdered(projectId).collectList()
                    ).map(tuple -> new WbsExportData(
                            tuple.getT1(),
                            tuple.getT2(),
                            tuple.getT3(),
                            tuple.getT4()
                    ));
                });
    }

    private Mono<Resource> generateExcelWorkbook(WbsExportData data) {
        return Mono.fromCallable(() -> {
            XSSFWorkbook workbook = excelService.createWorkbook();
            Sheet sheet = workbook.createSheet("WBS Data");

            // Styles
            CellStyle headerStyle = excelService.createHeaderStyle(workbook);
            CellStyle dataStyle = excelService.createDataStyle(workbook);
            CellStyle dateStyle = excelService.createDateStyle(workbook);

            // Create header row
            excelService.createHeaderRow(sheet, WBS_HEADERS, headerStyle);

            // Build hierarchical data and write rows
            int rowNum = 1;
            Map<String, R2dbcPhase> phaseMap = new HashMap<>();
            Map<String, R2dbcWbsGroup> groupMap = new HashMap<>();
            Map<String, R2dbcWbsItem> itemMap = new HashMap<>();

            // Index data by ID
            for (R2dbcPhase phase : data.phases()) {
                phaseMap.put(phase.getId(), phase);
            }
            for (R2dbcWbsGroup group : data.groups()) {
                groupMap.put(group.getId(), group);
            }
            for (R2dbcWbsItem item : data.items()) {
                itemMap.put(item.getId(), item);
            }

            // Write phase rows
            for (R2dbcPhase phase : data.phases()) {
                Row row = sheet.createRow(rowNum++);
                writePhaseRow(row, phase, dataStyle, dateStyle);
            }

            // Write group rows
            for (R2dbcWbsGroup group : data.groups()) {
                Row row = sheet.createRow(rowNum++);
                R2dbcPhase phase = phaseMap.get(group.getPhaseId());
                writeGroupRow(row, group, phase, dataStyle, dateStyle);
            }

            // Write item rows
            for (R2dbcWbsItem item : data.items()) {
                Row row = sheet.createRow(rowNum++);
                R2dbcPhase phase = phaseMap.get(item.getPhaseId());
                R2dbcWbsGroup group = groupMap.get(item.getGroupId());
                writeItemRow(row, item, phase, group, dataStyle, dateStyle);
            }

            // Write task rows
            for (R2dbcWbsTask task : data.tasks()) {
                Row row = sheet.createRow(rowNum++);
                R2dbcPhase phase = phaseMap.get(task.getPhaseId());
                R2dbcWbsGroup group = groupMap.get(task.getGroupId());
                R2dbcWbsItem item = itemMap.get(task.getItemId());
                writeTaskRow(row, task, phase, group, item, dataStyle, dateStyle);
            }

            // Add validations and auto-size
            excelService.addDropdownValidation(sheet, 9, STATUS_VALUES, 1, rowNum);
            excelService.autoSizeColumns(sheet, WBS_HEADERS.length);

            log.info("Generated WBS Excel with {} phases, {} groups, {} items, {} tasks",
                    data.phases().size(), data.groups().size(), data.items().size(), data.tasks().size());

            return writeWorkbookToResource(workbook);
        });
    }

    private void writePhaseRow(Row row, R2dbcPhase phase, CellStyle dataStyle, CellStyle dateStyle) {
        int col = 0;
        excelService.setCellValue(row.createCell(col++), "PHASE", dataStyle);
        excelService.setCellValue(row.createCell(col++), phase.getName(), dataStyle);
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // group code
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // group name
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // item code
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // item name
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // task code
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // task name
        excelService.setCellValue(row.createCell(col++), phase.getDescription(), dataStyle);
        excelService.setCellValue(row.createCell(col++), phase.getStatus(), dataStyle);
        excelService.setCellValue(row.createCell(col++), phase.getProgress(), dataStyle);
        excelService.setCellValue(row.createCell(col++), phase.getStartDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), phase.getEndDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), null, dateStyle); // actual start
        excelService.setCellValue(row.createCell(col++), null, dateStyle); // actual end
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // estimated hours
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // actual hours
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // assignee
        excelService.setCellValue(row.createCell(col), null, dataStyle); // weight
    }

    private void writeGroupRow(Row row, R2dbcWbsGroup group, R2dbcPhase phase, CellStyle dataStyle, CellStyle dateStyle) {
        int col = 0;
        excelService.setCellValue(row.createCell(col++), "GROUP", dataStyle);
        excelService.setCellValue(row.createCell(col++), phase != null ? phase.getName() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), group.getCode(), dataStyle);
        excelService.setCellValue(row.createCell(col++), group.getName(), dataStyle);
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // item code
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // item name
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // task code
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // task name
        excelService.setCellValue(row.createCell(col++), group.getDescription(), dataStyle);
        excelService.setCellValue(row.createCell(col++), group.getStatus(), dataStyle);
        excelService.setCellValue(row.createCell(col++), group.getProgress(), dataStyle);
        excelService.setCellValue(row.createCell(col++), group.getPlannedStartDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), group.getPlannedEndDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), group.getActualStartDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), group.getActualEndDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // estimated hours
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // actual hours
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // assignee
        excelService.setCellValue(row.createCell(col), group.getWeight(), dataStyle);
    }

    private void writeItemRow(Row row, R2dbcWbsItem item, R2dbcPhase phase, R2dbcWbsGroup group,
                              CellStyle dataStyle, CellStyle dateStyle) {
        int col = 0;
        excelService.setCellValue(row.createCell(col++), "ITEM", dataStyle);
        excelService.setCellValue(row.createCell(col++), phase != null ? phase.getName() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), group != null ? group.getCode() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), group != null ? group.getName() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), item.getCode(), dataStyle);
        excelService.setCellValue(row.createCell(col++), item.getName(), dataStyle);
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // task code
        excelService.setCellValue(row.createCell(col++), null, dataStyle); // task name
        excelService.setCellValue(row.createCell(col++), item.getDescription(), dataStyle);
        excelService.setCellValue(row.createCell(col++), item.getStatus(), dataStyle);
        excelService.setCellValue(row.createCell(col++), item.getProgress(), dataStyle);
        excelService.setCellValue(row.createCell(col++), item.getPlannedStartDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), item.getPlannedEndDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), item.getActualStartDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), item.getActualEndDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), item.getEstimatedHours(), dataStyle);
        excelService.setCellValue(row.createCell(col++), item.getActualHours(), dataStyle);
        excelService.setCellValue(row.createCell(col++), item.getAssigneeId(), dataStyle);
        excelService.setCellValue(row.createCell(col), item.getWeight(), dataStyle);
    }

    private void writeTaskRow(Row row, R2dbcWbsTask task, R2dbcPhase phase, R2dbcWbsGroup group,
                              R2dbcWbsItem item, CellStyle dataStyle, CellStyle dateStyle) {
        int col = 0;
        excelService.setCellValue(row.createCell(col++), "TASK", dataStyle);
        excelService.setCellValue(row.createCell(col++), phase != null ? phase.getName() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), group != null ? group.getCode() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), group != null ? group.getName() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), item != null ? item.getCode() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), item != null ? item.getName() : "", dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getCode(), dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getName(), dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getDescription(), dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getStatus(), dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getProgress(), dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getPlannedStartDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), task.getPlannedEndDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), task.getActualStartDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), task.getActualEndDate(), dateStyle);
        excelService.setCellValue(row.createCell(col++), task.getEstimatedHours(), dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getActualHours(), dataStyle);
        excelService.setCellValue(row.createCell(col++), task.getAssigneeId(), dataStyle);
        excelService.setCellValue(row.createCell(col), task.getWeight(), dataStyle);
    }

    private void createInstructionRows(Sheet sheet, CellStyle dataStyle) {
        // Example PHASE row
        Row row1 = sheet.createRow(1);
        excelService.setCellValue(row1.createCell(0), "PHASE", dataStyle);
        excelService.setCellValue(row1.createCell(1), "Phase Name", dataStyle);
        excelService.setCellValue(row1.createCell(8), "Phase description", dataStyle);
        excelService.setCellValue(row1.createCell(9), "NOT_STARTED", dataStyle);
        excelService.setCellValue(row1.createCell(10), 0, dataStyle);

        // Example GROUP row
        Row row2 = sheet.createRow(2);
        excelService.setCellValue(row2.createCell(0), "GROUP", dataStyle);
        excelService.setCellValue(row2.createCell(1), "Phase Name", dataStyle);
        excelService.setCellValue(row2.createCell(2), "GRP-001", dataStyle);
        excelService.setCellValue(row2.createCell(3), "Group Name", dataStyle);
        excelService.setCellValue(row2.createCell(9), "NOT_STARTED", dataStyle);
        excelService.setCellValue(row2.createCell(10), 0, dataStyle);
        excelService.setCellValue(row2.createCell(18), 100, dataStyle);

        // Example ITEM row
        Row row3 = sheet.createRow(3);
        excelService.setCellValue(row3.createCell(0), "ITEM", dataStyle);
        excelService.setCellValue(row3.createCell(1), "Phase Name", dataStyle);
        excelService.setCellValue(row3.createCell(2), "GRP-001", dataStyle);
        excelService.setCellValue(row3.createCell(3), "Group Name", dataStyle);
        excelService.setCellValue(row3.createCell(4), "ITM-001", dataStyle);
        excelService.setCellValue(row3.createCell(5), "Item Name", dataStyle);
        excelService.setCellValue(row3.createCell(9), "NOT_STARTED", dataStyle);
        excelService.setCellValue(row3.createCell(10), 0, dataStyle);

        // Example TASK row
        Row row4 = sheet.createRow(4);
        excelService.setCellValue(row4.createCell(0), "TASK", dataStyle);
        excelService.setCellValue(row4.createCell(1), "Phase Name", dataStyle);
        excelService.setCellValue(row4.createCell(2), "GRP-001", dataStyle);
        excelService.setCellValue(row4.createCell(3), "Group Name", dataStyle);
        excelService.setCellValue(row4.createCell(4), "ITM-001", dataStyle);
        excelService.setCellValue(row4.createCell(5), "Item Name", dataStyle);
        excelService.setCellValue(row4.createCell(6), "TSK-001", dataStyle);
        excelService.setCellValue(row4.createCell(7), "Task Name", dataStyle);
        excelService.setCellValue(row4.createCell(9), "NOT_STARTED", dataStyle);
        excelService.setCellValue(row4.createCell(10), 0, dataStyle);
    }

    private void addInstructionSheet(XSSFWorkbook workbook) {
        Sheet instructionSheet = workbook.createSheet("Instructions");
        CellStyle boldStyle = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        boldStyle.setFont(font);

        String[] instructions = {
                "WBS Import Instructions",
                "",
                "1. Level Column: Must be one of PHASE, GROUP, ITEM, or TASK",
                "2. Phase Column: Name of the phase (required for all rows)",
                "3. Group Code/Name: Required for GROUP, ITEM, and TASK rows",
                "4. Item Code/Name: Required for ITEM and TASK rows",
                "5. Task Code/Name: Required for TASK rows only",
                "6. Status: Must be one of NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED",
                "7. Progress: Integer value between 0 and 100",
                "8. Dates: Use YYYY-MM-DD format",
                "",
                "Hierarchy:",
                "  PHASE → GROUP → ITEM → TASK",
                "",
                "Note: Each level must have its parent defined before it in the file."
        };

        for (int i = 0; i < instructions.length; i++) {
            Row row = instructionSheet.createRow(i);
            Cell cell = row.createCell(0);
            cell.setCellValue(instructions[i]);
            if (i == 0) {
                cell.setCellStyle(boldStyle);
            }
        }

        instructionSheet.setColumnWidth(0, 15000);
    }

    // =============================================
    // Private Import Methods
    // =============================================

    private Mono<WbsImportResult> parseAndImportWbs(byte[] fileBytes, String projectId) {
        return Mono.fromCallable(() -> {
            WbsImportResult result = new WbsImportResult();

            try (ByteArrayInputStream bais = new ByteArrayInputStream(fileBytes);
                 Workbook workbook = new XSSFWorkbook(bais)) {

                Sheet sheet = workbook.getSheetAt(0);
                if (sheet == null) {
                    result.addError("No sheet found in workbook");
                    return result;
                }

                // Parse rows (skip header)
                List<WbsRowData> rows = new ArrayList<>();
                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null || excelService.isRowEmpty(row)) {
                        continue;
                    }

                    WbsRowData rowData = parseRow(row, i + 1);
                    if (rowData != null) {
                        rows.add(rowData);
                    } else {
                        result.addWarning("Skipped invalid row " + (i + 1));
                    }
                }

                result.setTotalRows(rows.size());
                return rows;

            } catch (Exception e) {
                log.error("Error parsing Excel file", e);
                result.addError("Failed to parse Excel file: " + e.getMessage());
                return result;
            }
        }).flatMap(parsed -> {
            if (parsed instanceof WbsImportResult) {
                return Mono.just((WbsImportResult) parsed);
            }

            @SuppressWarnings("unchecked")
            List<WbsRowData> rows = (List<WbsRowData>) parsed;
            return importWbsRows(rows, projectId);
        });
    }

    private WbsRowData parseRow(Row row, int rowNum) {
        String level = excelService.getCellStringValue(row.getCell(0));
        if (level == null || level.isEmpty()) {
            return null;
        }

        WbsRowData data = new WbsRowData();
        data.setRowNum(rowNum);
        data.setLevel(level.toUpperCase());
        data.setPhaseName(excelService.getCellStringValue(row.getCell(1)));
        data.setGroupCode(excelService.getCellStringValue(row.getCell(2)));
        data.setGroupName(excelService.getCellStringValue(row.getCell(3)));
        data.setItemCode(excelService.getCellStringValue(row.getCell(4)));
        data.setItemName(excelService.getCellStringValue(row.getCell(5)));
        data.setTaskCode(excelService.getCellStringValue(row.getCell(6)));
        data.setTaskName(excelService.getCellStringValue(row.getCell(7)));
        data.setDescription(excelService.getCellStringValue(row.getCell(8)));
        data.setStatus(excelService.getCellStringValue(row.getCell(9)));
        data.setProgress(excelService.getCellIntegerValue(row.getCell(10)));
        data.setPlannedStartDate(excelService.getCellDateValue(row.getCell(11)));
        data.setPlannedEndDate(excelService.getCellDateValue(row.getCell(12)));
        data.setActualStartDate(excelService.getCellDateValue(row.getCell(13)));
        data.setActualEndDate(excelService.getCellDateValue(row.getCell(14)));
        data.setEstimatedHours(excelService.getCellIntegerValue(row.getCell(15)));
        data.setActualHours(excelService.getCellIntegerValue(row.getCell(16)));
        data.setAssigneeId(excelService.getCellStringValue(row.getCell(17)));
        data.setWeight(excelService.getCellIntegerValue(row.getCell(18)));

        return data;
    }

    private Mono<WbsImportResult> importWbsRows(List<WbsRowData> rows, String projectId) {
        WbsImportResult result = new WbsImportResult();
        result.setTotalRows(rows.size());

        // Maps to track created/found entities
        Map<String, String> phaseNameToId = new HashMap<>();
        Map<String, String> groupKeyToId = new HashMap<>();
        Map<String, String> itemKeyToId = new HashMap<>();

        // First, get existing phases for the project
        return phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId)
                .collectList()
                .flatMap(existingPhases -> {
                    // Index existing phases
                    for (R2dbcPhase phase : existingPhases) {
                        phaseNameToId.put(phase.getName(), phase.getId());
                    }

                    // Process rows sequentially to maintain hierarchy
                    return Flux.fromIterable(rows)
                            .concatMap(rowData -> processWbsRow(rowData, projectId, phaseNameToId, groupKeyToId, itemKeyToId, result))
                            .then(Mono.just(result));
                })
                .doOnSuccess(r -> log.info("WBS import completed: {} total, {} phases, {} groups, {} items, {} tasks, {} errors",
                        r.getTotalRows(), r.getPhasesCreated(), r.getGroupsCreated(),
                        r.getItemsCreated(), r.getTasksCreated(), r.getErrors().size()));
    }

    private Mono<Void> processWbsRow(WbsRowData rowData, String projectId,
                                      Map<String, String> phaseNameToId,
                                      Map<String, String> groupKeyToId,
                                      Map<String, String> itemKeyToId,
                                      WbsImportResult result) {
        String level = rowData.getLevel();

        return switch (level) {
            case "PHASE" -> processPhaseRow(rowData, projectId, phaseNameToId, result);
            case "GROUP" -> processGroupRow(rowData, projectId, phaseNameToId, groupKeyToId, result);
            case "ITEM" -> processItemRow(rowData, projectId, phaseNameToId, groupKeyToId, itemKeyToId, result);
            case "TASK" -> processTaskRow(rowData, projectId, phaseNameToId, groupKeyToId, itemKeyToId, result);
            default -> {
                result.addWarning("Unknown level '" + level + "' at row " + rowData.getRowNum());
                yield Mono.empty();
            }
        };
    }

    private Mono<Void> processPhaseRow(WbsRowData rowData, String projectId,
                                        Map<String, String> phaseNameToId,
                                        WbsImportResult result) {
        if (rowData.getPhaseName() == null || rowData.getPhaseName().isEmpty()) {
            result.addError("Row " + rowData.getRowNum() + ": Phase name is required");
            return Mono.empty();
        }

        // Check if phase already exists
        if (phaseNameToId.containsKey(rowData.getPhaseName())) {
            return Mono.empty(); // Phase already exists
        }

        // Create new phase
        R2dbcPhase phase = R2dbcPhase.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .name(rowData.getPhaseName())
                .description(rowData.getDescription())
                .status(rowData.getStatus() != null ? rowData.getStatus() : "NOT_STARTED")
                .progress(rowData.getProgress() != null ? rowData.getProgress() : 0)
                .startDate(rowData.getPlannedStartDate())
                .endDate(rowData.getPlannedEndDate())
                .orderNum(phaseNameToId.size())
                .build();

        return phaseRepository.save(phase)
                .doOnSuccess(saved -> {
                    phaseNameToId.put(saved.getName(), saved.getId());
                    result.incrementPhasesCreated();
                    log.debug("Created phase: {}", saved.getName());
                })
                .then();
    }

    private Mono<Void> processGroupRow(WbsRowData rowData, String projectId,
                                        Map<String, String> phaseNameToId,
                                        Map<String, String> groupKeyToId,
                                        WbsImportResult result) {
        if (rowData.getPhaseName() == null || rowData.getGroupCode() == null) {
            result.addError("Row " + rowData.getRowNum() + ": Phase name and group code are required for GROUP level");
            return Mono.empty();
        }

        String phaseId = phaseNameToId.get(rowData.getPhaseName());
        if (phaseId == null) {
            result.addError("Row " + rowData.getRowNum() + ": Phase '" + rowData.getPhaseName() + "' not found");
            return Mono.empty();
        }

        String groupKey = phaseId + ":" + rowData.getGroupCode();
        if (groupKeyToId.containsKey(groupKey)) {
            return Mono.empty(); // Group already exists
        }

        R2dbcWbsGroup group = R2dbcWbsGroup.builder()
                .id(UUID.randomUUID().toString())
                .phaseId(phaseId)
                .code(rowData.getGroupCode())
                .name(rowData.getGroupName() != null ? rowData.getGroupName() : rowData.getGroupCode())
                .description(rowData.getDescription())
                .status(rowData.getStatus() != null ? rowData.getStatus() : "NOT_STARTED")
                .progress(rowData.getProgress() != null ? rowData.getProgress() : 0)
                .plannedStartDate(rowData.getPlannedStartDate())
                .plannedEndDate(rowData.getPlannedEndDate())
                .actualStartDate(rowData.getActualStartDate())
                .actualEndDate(rowData.getActualEndDate())
                .weight(rowData.getWeight() != null ? rowData.getWeight() : 100)
                .orderNum(groupKeyToId.size())
                .build();

        return wbsGroupRepository.save(group)
                .doOnSuccess(saved -> {
                    groupKeyToId.put(groupKey, saved.getId());
                    result.incrementGroupsCreated();
                    log.debug("Created group: {}", saved.getCode());
                })
                .then();
    }

    private Mono<Void> processItemRow(WbsRowData rowData, String projectId,
                                       Map<String, String> phaseNameToId,
                                       Map<String, String> groupKeyToId,
                                       Map<String, String> itemKeyToId,
                                       WbsImportResult result) {
        if (rowData.getPhaseName() == null || rowData.getGroupCode() == null || rowData.getItemCode() == null) {
            result.addError("Row " + rowData.getRowNum() + ": Phase name, group code, and item code are required for ITEM level");
            return Mono.empty();
        }

        String phaseId = phaseNameToId.get(rowData.getPhaseName());
        if (phaseId == null) {
            result.addError("Row " + rowData.getRowNum() + ": Phase '" + rowData.getPhaseName() + "' not found");
            return Mono.empty();
        }

        String groupKey = phaseId + ":" + rowData.getGroupCode();
        String groupId = groupKeyToId.get(groupKey);
        if (groupId == null) {
            result.addError("Row " + rowData.getRowNum() + ": Group '" + rowData.getGroupCode() + "' not found in phase '" + rowData.getPhaseName() + "'");
            return Mono.empty();
        }

        String itemKey = groupId + ":" + rowData.getItemCode();
        if (itemKeyToId.containsKey(itemKey)) {
            return Mono.empty(); // Item already exists
        }

        R2dbcWbsItem item = R2dbcWbsItem.builder()
                .id(UUID.randomUUID().toString())
                .phaseId(phaseId)
                .groupId(groupId)
                .code(rowData.getItemCode())
                .name(rowData.getItemName() != null ? rowData.getItemName() : rowData.getItemCode())
                .description(rowData.getDescription())
                .status(rowData.getStatus() != null ? rowData.getStatus() : "NOT_STARTED")
                .progress(rowData.getProgress() != null ? rowData.getProgress() : 0)
                .plannedStartDate(rowData.getPlannedStartDate())
                .plannedEndDate(rowData.getPlannedEndDate())
                .actualStartDate(rowData.getActualStartDate())
                .actualEndDate(rowData.getActualEndDate())
                .estimatedHours(rowData.getEstimatedHours())
                .actualHours(rowData.getActualHours())
                .assigneeId(rowData.getAssigneeId())
                .weight(rowData.getWeight() != null ? rowData.getWeight() : 100)
                .orderNum(itemKeyToId.size())
                .build();

        return wbsItemRepository.save(item)
                .doOnSuccess(saved -> {
                    itemKeyToId.put(itemKey, saved.getId());
                    result.incrementItemsCreated();
                    log.debug("Created item: {}", saved.getCode());
                })
                .then();
    }

    private Mono<Void> processTaskRow(WbsRowData rowData, String projectId,
                                       Map<String, String> phaseNameToId,
                                       Map<String, String> groupKeyToId,
                                       Map<String, String> itemKeyToId,
                                       WbsImportResult result) {
        if (rowData.getPhaseName() == null || rowData.getGroupCode() == null ||
                rowData.getItemCode() == null || rowData.getTaskCode() == null) {
            result.addError("Row " + rowData.getRowNum() + ": Phase, group, item, and task codes are required for TASK level");
            return Mono.empty();
        }

        String phaseId = phaseNameToId.get(rowData.getPhaseName());
        if (phaseId == null) {
            result.addError("Row " + rowData.getRowNum() + ": Phase '" + rowData.getPhaseName() + "' not found");
            return Mono.empty();
        }

        String groupKey = phaseId + ":" + rowData.getGroupCode();
        String groupId = groupKeyToId.get(groupKey);
        if (groupId == null) {
            result.addError("Row " + rowData.getRowNum() + ": Group '" + rowData.getGroupCode() + "' not found");
            return Mono.empty();
        }

        String itemKey = groupId + ":" + rowData.getItemCode();
        String itemId = itemKeyToId.get(itemKey);
        if (itemId == null) {
            result.addError("Row " + rowData.getRowNum() + ": Item '" + rowData.getItemCode() + "' not found");
            return Mono.empty();
        }

        R2dbcWbsTask task = R2dbcWbsTask.builder()
                .id(UUID.randomUUID().toString())
                .phaseId(phaseId)
                .groupId(groupId)
                .itemId(itemId)
                .code(rowData.getTaskCode())
                .name(rowData.getTaskName() != null ? rowData.getTaskName() : rowData.getTaskCode())
                .description(rowData.getDescription())
                .status(rowData.getStatus() != null ? rowData.getStatus() : "NOT_STARTED")
                .progress(rowData.getProgress() != null ? rowData.getProgress() : 0)
                .plannedStartDate(rowData.getPlannedStartDate())
                .plannedEndDate(rowData.getPlannedEndDate())
                .actualStartDate(rowData.getActualStartDate())
                .actualEndDate(rowData.getActualEndDate())
                .estimatedHours(rowData.getEstimatedHours())
                .actualHours(rowData.getActualHours())
                .assigneeId(rowData.getAssigneeId())
                .weight(rowData.getWeight() != null ? rowData.getWeight() : 100)
                .orderNum(0)
                .build();

        return wbsTaskRepository.save(task)
                .doOnSuccess(saved -> {
                    result.incrementTasksCreated();
                    log.debug("Created task: {}", saved.getCode());
                })
                .then();
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

    private record WbsExportData(
            List<R2dbcPhase> phases,
            List<R2dbcWbsGroup> groups,
            List<R2dbcWbsItem> items,
            List<R2dbcWbsTask> tasks
    ) {}

    @lombok.Data
    private static class WbsRowData {
        private int rowNum;
        private String level;
        private String phaseName;
        private String groupCode;
        private String groupName;
        private String itemCode;
        private String itemName;
        private String taskCode;
        private String taskName;
        private String description;
        private String status;
        private Integer progress;
        private LocalDate plannedStartDate;
        private LocalDate plannedEndDate;
        private LocalDate actualStartDate;
        private LocalDate actualEndDate;
        private Integer estimatedHours;
        private Integer actualHours;
        private String assigneeId;
        private Integer weight;
    }

    @lombok.Data
    public static class WbsImportResult {
        private int totalRows;
        private int phasesCreated;
        private int groupsCreated;
        private int itemsCreated;
        private int tasksCreated;
        private List<String> errors = new ArrayList<>();
        private List<String> warnings = new ArrayList<>();

        public void incrementPhasesCreated() { phasesCreated++; }
        public void incrementGroupsCreated() { groupsCreated++; }
        public void incrementItemsCreated() { itemsCreated++; }
        public void incrementTasksCreated() { tasksCreated++; }
        public void addError(String error) { errors.add(error); }
        public void addWarning(String warning) { warnings.add(warning); }

        public int getTotalCreated() {
            return phasesCreated + groupsCreated + itemsCreated + tasksCreated;
        }
    }
}
