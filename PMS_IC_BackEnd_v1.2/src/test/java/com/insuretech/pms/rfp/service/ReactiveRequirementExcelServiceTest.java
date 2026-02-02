package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.service.ExcelService;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirement;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementRepository;
import com.insuretech.pms.rfp.reactive.service.ReactiveRequirementExcelService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveRequirementExcelService Tests")
class ReactiveRequirementExcelServiceTest {

    @Spy
    private ExcelService excelService = new ExcelService();

    @Mock
    private ReactiveRequirementRepository requirementRepository;

    @InjectMocks
    private ReactiveRequirementExcelService requirementExcelService;

    private String projectId;
    private String rfpId;
    private String tenantId;
    private R2dbcRequirement testRequirement;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID().toString();
        rfpId = UUID.randomUUID().toString();
        tenantId = projectId;

        testRequirement = R2dbcRequirement.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .rfpId(rfpId)
                .tenantId(tenantId)
                .code("REQ-001")
                .title("User Login Feature")
                .description("Users should be able to login with email/password")
                .category("FUNCTIONAL")
                .priority("HIGH")
                .status("IDENTIFIED")
                .progress(0)
                .progressPercentage(0)
                .storyPoints(5)
                .estimatedEffortHours(40)
                .build();
    }

    @Nested
    @DisplayName("exportToExcel")
    class ExportToExcel {

        @Test
        @DisplayName("should export requirements to Excel successfully")
        void shouldExportRequirementsSuccessfully() throws IOException {
            when(requirementRepository.findByProjectIdOrderByCodeAsc(projectId))
                    .thenReturn(Flux.just(testRequirement));

            StepVerifier.create(requirementExcelService.exportToExcel(projectId))
                    .assertNext(resource -> {
                        assertThat(resource).isNotNull();
                        assertThat(resource.exists()).isTrue();

                        // Verify Excel content
                        try {
                            byte[] content = resource.getInputStream().readAllBytes();
                            try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
                                Sheet sheet = workbook.getSheetAt(0);
                                assertThat(sheet).isNotNull();
                                assertThat(sheet.getSheetName()).isEqualTo("Requirements");
                                // Header row + 1 data row
                                assertThat(sheet.getLastRowNum()).isGreaterThanOrEqualTo(1);

                                // Verify first data row contains requirement code
                                var dataRow = sheet.getRow(1);
                                assertThat(dataRow.getCell(0).getStringCellValue()).isEqualTo("REQ-001");
                            }
                        } catch (IOException e) {
                            throw new RuntimeException("Failed to read Excel content", e);
                        }
                    })
                    .verifyComplete();

            verify(requirementRepository).findByProjectIdOrderByCodeAsc(projectId);
        }

        @Test
        @DisplayName("should return empty Excel when no requirements exist")
        void shouldReturnEmptyExcelWhenNoRequirements() {
            when(requirementRepository.findByProjectIdOrderByCodeAsc(projectId))
                    .thenReturn(Flux.empty());

            StepVerifier.create(requirementExcelService.exportToExcel(projectId))
                    .assertNext(resource -> {
                        assertThat(resource).isNotNull();
                        assertThat(resource.exists()).isTrue();
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("exportByRfpToExcel")
    class ExportByRfpToExcel {

        @Test
        @DisplayName("should export requirements by RFP successfully")
        void shouldExportByRfpSuccessfully() {
            when(requirementRepository.findByRfpId(rfpId))
                    .thenReturn(Flux.just(testRequirement));

            StepVerifier.create(requirementExcelService.exportByRfpToExcel(rfpId))
                    .assertNext(resource -> {
                        assertThat(resource).isNotNull();
                        assertThat(resource.exists()).isTrue();
                    })
                    .verifyComplete();

            verify(requirementRepository).findByRfpId(rfpId);
        }
    }

    @Nested
    @DisplayName("generateTemplate")
    class GenerateTemplate {

        @Test
        @DisplayName("should generate requirement template successfully")
        void shouldGenerateTemplateSuccessfully() throws IOException {
            StepVerifier.create(requirementExcelService.generateTemplate())
                    .assertNext(resource -> {
                        assertThat(resource).isNotNull();
                        assertThat(resource.exists()).isTrue();

                        // Verify template structure
                        try {
                            byte[] content = resource.getInputStream().readAllBytes();
                            try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
                                // Should have template sheet and instructions sheet
                                assertThat(workbook.getNumberOfSheets()).isEqualTo(2);

                                Sheet requirementsSheet = workbook.getSheet("Requirements");
                                assertThat(requirementsSheet).isNotNull();

                                Sheet instructionSheet = workbook.getSheet("Instructions");
                                assertThat(instructionSheet).isNotNull();

                                // Verify header row exists with Code column
                                assertThat(requirementsSheet.getRow(0)).isNotNull();
                                assertThat(requirementsSheet.getRow(0).getCell(0).getStringCellValue())
                                        .isEqualTo("Code");
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
        @DisplayName("should import requirements from valid Excel successfully")
        void shouldImportRequirementsSuccessfully() throws IOException {
            // Create test Excel file with requirement data
            byte[] excelBytes = createTestRequirementExcel();

            when(requirementRepository.findByCode("REQ-001"))
                    .thenReturn(Mono.empty());
            when(requirementRepository.save(any(R2dbcRequirement.class)))
                    .thenAnswer(inv -> Mono.just(inv.getArgument(0)));

            StepVerifier.create(requirementExcelService.importFromBytes(excelBytes, projectId, rfpId, tenantId))
                    .assertNext(result -> {
                        assertThat(result).isNotNull();
                        assertThat(result.getTotalRows()).isEqualTo(1);
                        assertThat(result.getCreated()).isEqualTo(1);
                        assertThat(result.getErrors()).isEmpty();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should update existing requirement when code exists")
        void shouldUpdateExistingRequirement() throws IOException {
            byte[] excelBytes = createTestRequirementExcel();

            when(requirementRepository.findByCode("REQ-001"))
                    .thenReturn(Mono.just(testRequirement));
            when(requirementRepository.save(any(R2dbcRequirement.class)))
                    .thenAnswer(inv -> Mono.just(inv.getArgument(0)));

            StepVerifier.create(requirementExcelService.importFromBytes(excelBytes, projectId, rfpId, tenantId))
                    .assertNext(result -> {
                        assertThat(result).isNotNull();
                        // When requirement exists, it should be updated
                        assertThat(result.getUpdated()).isGreaterThanOrEqualTo(1);
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should handle invalid Excel file gracefully")
        void shouldHandleInvalidExcelGracefully() {
            byte[] invalidBytes = "not an excel file".getBytes();

            StepVerifier.create(requirementExcelService.importFromBytes(invalidBytes, projectId, rfpId, tenantId))
                    .assertNext(result -> {
                        assertThat(result).isNotNull();
                        assertThat(result.getErrors()).isNotEmpty();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should skip rows with missing code")
        void shouldSkipRowsWithMissingCode() throws IOException {
            byte[] excelBytes = createExcelWithMissingCode();

            StepVerifier.create(requirementExcelService.importFromBytes(excelBytes, projectId, rfpId, tenantId))
                    .assertNext(result -> {
                        assertThat(result).isNotNull();
                        assertThat(result.getTotalRows()).isEqualTo(0);
                        assertThat(result.getWarnings()).isNotEmpty();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should validate category values")
        void shouldValidateCategoryValues() throws IOException {
            byte[] excelBytes = createExcelWithInvalidCategory();

            when(requirementRepository.findByCode("REQ-002"))
                    .thenReturn(Mono.empty());
            when(requirementRepository.save(any(R2dbcRequirement.class)))
                    .thenAnswer(inv -> {
                        R2dbcRequirement saved = inv.getArgument(0);
                        // Invalid category should default to FUNCTIONAL
                        assertThat(saved.getCategory()).isEqualTo("FUNCTIONAL");
                        return Mono.just(saved);
                    });

            StepVerifier.create(requirementExcelService.importFromBytes(excelBytes, projectId, rfpId, tenantId))
                    .assertNext(result -> {
                        assertThat(result.getCreated()).isEqualTo(1);
                    })
                    .verifyComplete();
        }
    }

    // Helper methods to create test Excel files

    private byte[] createTestRequirementExcel() throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Requirements");

        // Header row
        var headerRow = sheet.createRow(0);
        String[] headers = {"Code", "Title", "Description", "Category", "Priority", "Status",
                "Progress (%)", "Source Text", "Page Number", "Assignee ID",
                "Due Date", "Acceptance Criteria", "Story Points",
                "Estimated Hours", "Actual Hours", "Remaining Hours"};
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }

        // Data row
        var dataRow = sheet.createRow(1);
        dataRow.createCell(0).setCellValue("REQ-001");
        dataRow.createCell(1).setCellValue("User Login Feature");
        dataRow.createCell(2).setCellValue("Users should be able to login");
        dataRow.createCell(3).setCellValue("FUNCTIONAL");
        dataRow.createCell(4).setCellValue("HIGH");
        dataRow.createCell(5).setCellValue("IDENTIFIED");
        dataRow.createCell(6).setCellValue(0);
        dataRow.createCell(12).setCellValue(5);
        dataRow.createCell(13).setCellValue(40);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();
        return baos.toByteArray();
    }

    private byte[] createExcelWithMissingCode() throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Requirements");

        // Header row
        var headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("Code");
        headerRow.createCell(1).setCellValue("Title");

        // Data row with missing code
        var dataRow = sheet.createRow(1);
        // Cell 0 (code) is empty
        dataRow.createCell(1).setCellValue("Some Title");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();
        return baos.toByteArray();
    }

    private byte[] createExcelWithInvalidCategory() throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Requirements");

        // Header row
        var headerRow = sheet.createRow(0);
        String[] headers = {"Code", "Title", "Description", "Category"};
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }

        // Data row with invalid category
        var dataRow = sheet.createRow(1);
        dataRow.createCell(0).setCellValue("REQ-002");
        dataRow.createCell(1).setCellValue("Test Requirement");
        dataRow.createCell(2).setCellValue("Description");
        dataRow.createCell(3).setCellValue("INVALID_CATEGORY"); // Should default to FUNCTIONAL

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();
        return baos.toByteArray();
    }
}
