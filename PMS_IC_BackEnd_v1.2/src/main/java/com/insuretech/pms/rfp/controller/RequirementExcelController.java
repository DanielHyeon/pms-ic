package com.insuretech.pms.rfp.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.common.dto.ImportResult;
import com.insuretech.pms.rfp.service.RequirementExcelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * REST Controller for Requirement Excel import/export operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/projects/{projectId}/requirements/excel")
@RequiredArgsConstructor
@Tag(name = "Requirement Excel", description = "Requirement Excel import/export API")
public class RequirementExcelController {

    private final RequirementExcelService excelService;

    /**
     * Download empty Excel template with headers and data validation.
     */
    @Operation(summary = "Download requirement template",
            description = "Downloads an empty Excel template with headers, data validation, and a sample row for guidance")
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate(@PathVariable String projectId) {
        try {
            byte[] content = excelService.generateTemplate(projectId);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=requirements_template.xlsx")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(content.length)
                    .body(content);
        } catch (IOException e) {
            log.error("Failed to generate template for project {}: {}", projectId, e.getMessage());
            throw new RuntimeException("Failed to generate Excel template", e);
        }
    }

    /**
     * Export existing requirements to Excel file.
     */
    @Operation(summary = "Export requirements to Excel",
            description = "Exports all requirements for the project to an Excel file")
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportRequirements(@PathVariable String projectId) {
        try {
            byte[] content = excelService.exportRequirements(projectId);

            String filename = String.format("requirements_export_%s.xlsx", projectId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(content.length)
                    .body(content);
        } catch (IOException e) {
            log.error("Failed to export requirements for project {}: {}", projectId, e.getMessage());
            throw new RuntimeException("Failed to export requirements to Excel", e);
        }
    }

    /**
     * Import requirements from Excel file.
     * - If Code column has value: UPDATE existing requirement
     * - If Code column is empty: CREATE new requirement with auto-generated code
     */
    @Operation(summary = "Import requirements from Excel",
            description = "Imports requirements from an Excel file. Existing requirements (matched by code) are updated, new ones are created.")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'BUSINESS_ANALYST', 'ADMIN')")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ImportResult>> importRequirements(
            @PathVariable String projectId,
            @RequestParam("file") MultipartFile file) {

        // Validate file
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("File is empty"));
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid file type. Please upload an Excel file (.xlsx or .xls)"));
        }

        // Check file size (10MB limit)
        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("File size exceeds 10MB limit"));
        }

        try {
            ImportResult result = excelService.importRequirements(projectId, file);

            String message = result.isSuccess()
                    ? String.format("Successfully imported %d requirements (%d created, %d updated)",
                            result.getSuccessCount(), result.getCreateCount(), result.getUpdateCount())
                    : String.format("Import completed with errors: %d success, %d errors",
                            result.getSuccessCount(), result.getErrorCount());

            return ResponseEntity.ok(ApiResponse.success(message, result));

        } catch (IOException e) {
            log.error("Failed to import requirements for project {}: {}", projectId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to read Excel file: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during import for project {}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Import failed: " + e.getMessage()));
        }
    }
}
