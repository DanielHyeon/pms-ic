package com.insuretech.pms.project.service;

import com.insuretech.pms.common.service.ExcelService;
import com.insuretech.pms.project.reactive.entity.R2dbcPhase;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsGroup;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsItem;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsTask;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsGroupRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsTaskRepository;
import com.insuretech.pms.project.reactive.service.ReactiveWbsExcelService;
import com.insuretech.pms.support.R2dbcTestDataFactory;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveWbsExcelService Tests")
class ReactiveWbsExcelServiceTest {

    @Spy
    private ExcelService excelService = new ExcelService();

    @Mock
    private ReactivePhaseRepository phaseRepository;

    @Mock
    private ReactiveWbsGroupRepository wbsGroupRepository;

    @Mock
    private ReactiveWbsItemRepository wbsItemRepository;

    @Mock
    private ReactiveWbsTaskRepository wbsTaskRepository;

    @InjectMocks
    private ReactiveWbsExcelService wbsExcelService;

    private String projectId;
    private R2dbcPhase testPhase;
    private R2dbcWbsGroup testGroup;
    private R2dbcWbsItem testItem;
    private R2dbcWbsTask testTask;

    @BeforeEach
    void setUp() {
        R2dbcTestDataFactory.resetCounter();
        projectId = UUID.randomUUID().toString();

        testPhase = R2dbcTestDataFactory.phase()
                .projectId(projectId)
                .name("Analysis Phase")
                .build();

        testGroup = R2dbcTestDataFactory.wbsGroup()
                .phaseId(testPhase.getId())
                .name("Requirements Analysis")
                .build();
        testGroup.setCode("GRP-001");

        testItem = R2dbcTestDataFactory.wbsItem()
                .groupId(testGroup.getId())
                .phaseId(testPhase.getId())
                .name("Gather Requirements")
                .build();

        testTask = R2dbcTestDataFactory.wbsTask()
                .itemId(testItem.getId())
                .groupId(testGroup.getId())
                .phaseId(testPhase.getId())
                .name("Interview Stakeholders")
                .build();
    }

    @Nested
    @DisplayName("exportToExcel")
    class ExportToExcel {

        @Test
        @DisplayName("should export WBS data to Excel successfully")
        void shouldExportWbsDataSuccessfully() throws IOException {
            when(phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId))
                    .thenReturn(Flux.just(testPhase));
            when(wbsGroupRepository.findByProjectIdOrdered(projectId))
                    .thenReturn(Flux.just(testGroup));
            when(wbsItemRepository.findByProjectIdOrdered(projectId))
                    .thenReturn(Flux.just(testItem));
            when(wbsTaskRepository.findByProjectIdOrdered(projectId))
                    .thenReturn(Flux.just(testTask));

            StepVerifier.create(wbsExcelService.exportToExcel(projectId))
                    .assertNext(resource -> {
                        assertThat(resource).isNotNull();
                        assertThat(resource.exists()).isTrue();

                        // Verify Excel content
                        try {
                            byte[] content = resource.getInputStream().readAllBytes();
                            try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
                                Sheet sheet = workbook.getSheetAt(0);
                                assertThat(sheet).isNotNull();
                                assertThat(sheet.getSheetName()).isEqualTo("WBS Data");
                                // Header row + 4 data rows (phase, group, item, task)
                                assertThat(sheet.getLastRowNum()).isGreaterThanOrEqualTo(4);
                            }
                        } catch (IOException e) {
                            throw new RuntimeException("Failed to read Excel content", e);
                        }
                    })
                    .verifyComplete();

            verify(phaseRepository).findByProjectIdOrderByOrderNumAsc(projectId);
            verify(wbsGroupRepository).findByProjectIdOrdered(projectId);
            verify(wbsItemRepository).findByProjectIdOrdered(projectId);
            verify(wbsTaskRepository).findByProjectIdOrdered(projectId);
        }

        @Test
        @DisplayName("should return empty Excel when no data exists")
        void shouldReturnEmptyExcelWhenNoData() {
            when(phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId))
                    .thenReturn(Flux.empty());

            StepVerifier.create(wbsExcelService.exportToExcel(projectId))
                    .assertNext(resource -> {
                        assertThat(resource).isNotNull();
                        assertThat(resource.exists()).isTrue();
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("generateTemplate")
    class GenerateTemplate {

        @Test
        @DisplayName("should generate WBS template successfully")
        void shouldGenerateTemplateSuccessfully() throws IOException {
            StepVerifier.create(wbsExcelService.generateTemplate())
                    .assertNext(resource -> {
                        assertThat(resource).isNotNull();
                        assertThat(resource.exists()).isTrue();

                        // Verify template structure
                        try {
                            byte[] content = resource.getInputStream().readAllBytes();
                            try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
                                // Should have template sheet and instructions sheet
                                assertThat(workbook.getNumberOfSheets()).isEqualTo(2);

                                Sheet templateSheet = workbook.getSheet("WBS Template");
                                assertThat(templateSheet).isNotNull();

                                Sheet instructionSheet = workbook.getSheet("Instructions");
                                assertThat(instructionSheet).isNotNull();

                                // Verify header row exists
                                assertThat(templateSheet.getRow(0)).isNotNull();
                                assertThat(templateSheet.getRow(0).getCell(0).getStringCellValue())
                                        .isEqualTo("Level");
                            }
                        } catch (IOException e) {
                            throw new RuntimeException("Failed to read template content", e);
                        }
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("importFromBytes")
    class ImportFromBytes {

        @Test
        @DisplayName("should import WBS data from valid Excel successfully")
        void shouldImportWbsDataSuccessfully() throws IOException {
            // Create test Excel file with WBS data
            byte[] excelBytes = createTestWbsExcel();

            when(phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId))
                    .thenReturn(Flux.empty());
            when(phaseRepository.save(any(R2dbcPhase.class)))
                    .thenAnswer(inv -> Mono.just(inv.getArgument(0)));
            when(wbsGroupRepository.save(any(R2dbcWbsGroup.class)))
                    .thenAnswer(inv -> Mono.just(inv.getArgument(0)));
            when(wbsItemRepository.save(any(R2dbcWbsItem.class)))
                    .thenAnswer(inv -> Mono.just(inv.getArgument(0)));
            when(wbsTaskRepository.save(any(R2dbcWbsTask.class)))
                    .thenAnswer(inv -> Mono.just(inv.getArgument(0)));

            StepVerifier.create(wbsExcelService.importFromBytes(excelBytes, projectId))
                    .assertNext(result -> {
                        assertThat(result).isNotNull();
                        assertThat(result.getTotalRows()).isGreaterThan(0);
                        assertThat(result.getErrors()).isEmpty();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should handle invalid Excel file gracefully")
        void shouldHandleInvalidExcelGracefully() {
            byte[] invalidBytes = "not an excel file".getBytes();

            StepVerifier.create(wbsExcelService.importFromBytes(invalidBytes, projectId))
                    .assertNext(result -> {
                        assertThat(result).isNotNull();
                        assertThat(result.getErrors()).isNotEmpty();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should skip rows with missing phase name")
        void shouldSkipRowsWithMissingPhaseName() throws IOException {
            // Create Excel with missing phase name
            byte[] excelBytes = createExcelWithMissingPhaseName();

            when(phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId))
                    .thenReturn(Flux.empty());

            StepVerifier.create(wbsExcelService.importFromBytes(excelBytes, projectId))
                    .assertNext(result -> {
                        assertThat(result).isNotNull();
                        // Should have errors or warnings for invalid rows
                        assertThat(result.getPhasesCreated()).isEqualTo(0);
                    })
                    .verifyComplete();
        }
    }

    // Helper methods to create test Excel files

    private byte[] createTestWbsExcel() throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("WBS Data");

        // Header row
        var headerRow = sheet.createRow(0);
        String[] headers = {"Level", "Phase", "Group Code", "Group Name", "Item Code", "Item Name",
                "Task Code", "Task Name", "Description", "Status", "Progress (%)"};
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }

        // Phase row
        var phaseRow = sheet.createRow(1);
        phaseRow.createCell(0).setCellValue("PHASE");
        phaseRow.createCell(1).setCellValue("Test Phase");
        phaseRow.createCell(9).setCellValue("NOT_STARTED");
        phaseRow.createCell(10).setCellValue(0);

        // Group row
        var groupRow = sheet.createRow(2);
        groupRow.createCell(0).setCellValue("GROUP");
        groupRow.createCell(1).setCellValue("Test Phase");
        groupRow.createCell(2).setCellValue("GRP-001");
        groupRow.createCell(3).setCellValue("Test Group");
        groupRow.createCell(9).setCellValue("NOT_STARTED");
        groupRow.createCell(10).setCellValue(0);

        // Item row
        var itemRow = sheet.createRow(3);
        itemRow.createCell(0).setCellValue("ITEM");
        itemRow.createCell(1).setCellValue("Test Phase");
        itemRow.createCell(2).setCellValue("GRP-001");
        itemRow.createCell(3).setCellValue("Test Group");
        itemRow.createCell(4).setCellValue("ITM-001");
        itemRow.createCell(5).setCellValue("Test Item");
        itemRow.createCell(9).setCellValue("NOT_STARTED");
        itemRow.createCell(10).setCellValue(0);

        // Task row
        var taskRow = sheet.createRow(4);
        taskRow.createCell(0).setCellValue("TASK");
        taskRow.createCell(1).setCellValue("Test Phase");
        taskRow.createCell(2).setCellValue("GRP-001");
        taskRow.createCell(3).setCellValue("Test Group");
        taskRow.createCell(4).setCellValue("ITM-001");
        taskRow.createCell(5).setCellValue("Test Item");
        taskRow.createCell(6).setCellValue("TSK-001");
        taskRow.createCell(7).setCellValue("Test Task");
        taskRow.createCell(9).setCellValue("NOT_STARTED");
        taskRow.createCell(10).setCellValue(0);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();
        return baos.toByteArray();
    }

    private byte[] createExcelWithMissingPhaseName() throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("WBS Data");

        // Header row
        var headerRow = sheet.createRow(0);
        String[] headers = {"Level", "Phase", "Group Code"};
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }

        // Phase row with missing phase name
        var phaseRow = sheet.createRow(1);
        phaseRow.createCell(0).setCellValue("PHASE");
        // Phase name (cell 1) is empty

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();
        return baos.toByteArray();
    }
}
