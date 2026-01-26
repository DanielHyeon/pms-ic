package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.common.dto.ImportResult;
import com.insuretech.pms.project.service.WbsExcelService;
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
 * REST Controller for WBS Excel import/export operations.
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "WBS Excel", description = "WBS Excel import/export API")
public class WbsExcelController {

    private final WbsExcelService excelService;

    /**
     * Download empty Excel template with headers and data validation.
     */
    @Operation(summary = "Download WBS template",
            description = "Downloads an empty Excel template with headers, data validation, and sample rows for guidance")
    @GetMapping("/projects/{projectId}/wbs/excel/template")
    public ResponseEntity<byte[]> downloadTemplate(@PathVariable String projectId) {
        try {
            byte[] content = excelService.generateTemplate(projectId);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=wbs_template.xlsx")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(content.length)
                    .body(content);
        } catch (IOException e) {
            log.error("Failed to generate WBS template for project {}: {}", projectId, e.getMessage());
            throw new RuntimeException("Failed to generate Excel template", e);
        }
    }

    /**
     * Export all WBS data for a project to Excel file.
     */
    @Operation(summary = "Export WBS to Excel",
            description = "Exports all WBS data (Groups, Items, Tasks) for the project to an Excel file")
    @GetMapping("/projects/{projectId}/wbs/excel/export")
    public ResponseEntity<byte[]> exportWbs(@PathVariable String projectId) {
        try {
            byte[] content = excelService.exportWbs(projectId);

            String filename = String.format("wbs_export_%s.xlsx", projectId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(content.length)
                    .body(content);
        } catch (IOException e) {
            log.error("Failed to export WBS for project {}: {}", projectId, e.getMessage());
            throw new RuntimeException("Failed to export WBS to Excel", e);
        }
    }

    /**
     * Export WBS data for a specific phase to Excel file.
     */
    @Operation(summary = "Export WBS by phase to Excel",
            description = "Exports WBS data (Groups, Items, Tasks) for a specific phase to an Excel file")
    @GetMapping("/phases/{phaseId}/wbs/excel/export")
    public ResponseEntity<byte[]> exportWbsByPhase(@PathVariable String phaseId) {
        try {
            byte[] content = excelService.exportWbsByPhase(phaseId);

            String filename = String.format("wbs_phase_%s_export.xlsx", phaseId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(content.length)
                    .body(content);
        } catch (IOException e) {
            log.error("Failed to export WBS for phase {}: {}", phaseId, e.getMessage());
            throw new RuntimeException("Failed to export WBS to Excel", e);
        }
    }

    /**
     * Import WBS from Excel file.
     * - If code columns have values: UPDATE existing WBS items
     * - If code columns are empty: CREATE new WBS items with auto-generated codes
     */
    @Operation(summary = "Import WBS from Excel",
            description = "Imports WBS data from an Excel file. Existing items (matched by code) are updated, new ones are created.")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'ADMIN')")
    @PostMapping(value = "/projects/{projectId}/wbs/excel/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ImportResult>> importWbs(
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
            ImportResult result = excelService.importWbs(projectId, file);

            String message = result.isSuccess()
                    ? String.format("Successfully imported %d WBS items (%d created, %d updated)",
                            result.getSuccessCount(), result.getCreateCount(), result.getUpdateCount())
                    : String.format("Import completed with errors: %d success, %d errors",
                            result.getSuccessCount(), result.getErrorCount());

            return ResponseEntity.ok(ApiResponse.success(message, result));

        } catch (IOException e) {
            log.error("Failed to import WBS for project {}: {}", projectId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to read Excel file: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during WBS import for project {}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Import failed: " + e.getMessage()));
        }
    }
}
