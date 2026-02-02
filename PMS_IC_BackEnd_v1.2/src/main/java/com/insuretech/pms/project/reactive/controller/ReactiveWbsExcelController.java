package com.insuretech.pms.project.reactive.controller;

import com.insuretech.pms.project.reactive.service.ReactiveWbsExcelService;
import com.insuretech.pms.project.reactive.service.ReactiveWbsExcelService.WbsImportResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Reactive REST Controller for WBS Excel import/export operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/projects/{projectId}/wbs/excel")
@RequiredArgsConstructor
public class ReactiveWbsExcelController {

    private final ReactiveWbsExcelService wbsExcelService;

    private static final String EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /**
     * Export WBS data to Excel file.
     *
     * @param projectId Project ID
     * @return Excel file as downloadable resource
     */
    @GetMapping("/export")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<Resource>> exportWbs(@PathVariable String projectId) {
        log.info("WBS export requested for project: {}", projectId);

        String filename = generateFilename("WBS_Export", projectId);

        return wbsExcelService.exportToExcel(projectId)
                .map(resource -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .body(resource))
                .doOnSuccess(r -> log.info("WBS export completed for project: {}", projectId))
                .onErrorResume(e -> {
                    log.error("WBS export failed for project: {}", projectId, e);
                    return Mono.just(ResponseEntity.internalServerError().build());
                });
    }

    /**
     * Download WBS import template.
     *
     * @return Excel template file
     */
    @GetMapping("/template")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<Resource>> downloadTemplate() {
        log.info("WBS template download requested");

        String filename = "WBS_Template.xlsx";

        return wbsExcelService.generateTemplate()
                .map(resource -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .body(resource))
                .doOnSuccess(r -> log.info("WBS template generated successfully"))
                .onErrorResume(e -> {
                    log.error("WBS template generation failed", e);
                    return Mono.just(ResponseEntity.internalServerError().build());
                });
    }

    /**
     * Import WBS data from Excel file.
     *
     * @param projectId Project ID
     * @param file      Uploaded Excel file
     * @return Import result with statistics
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<WbsImportResult>> importWbs(
            @PathVariable String projectId,
            @RequestPart("file") FilePart file) {

        log.info("WBS import requested for project: {}, file: {}", projectId, file.filename());

        // Validate file extension
        String filename = file.filename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            WbsImportResult errorResult = new WbsImportResult();
            errorResult.addError("Invalid file type. Please upload an Excel file (.xlsx or .xls)");
            return Mono.just(ResponseEntity.badRequest().body(errorResult));
        }

        return wbsExcelService.importFromExcel(file, projectId)
                .map(result -> {
                    if (result.getErrors().isEmpty()) {
                        log.info("WBS import successful for project: {}. Created: {} phases, {} groups, {} items, {} tasks",
                                projectId, result.getPhasesCreated(), result.getGroupsCreated(),
                                result.getItemsCreated(), result.getTasksCreated());
                        return ResponseEntity.ok(result);
                    } else {
                        log.warn("WBS import completed with errors for project: {}. Errors: {}",
                                projectId, result.getErrors().size());
                        return ResponseEntity.ok(result);
                    }
                })
                .onErrorResume(e -> {
                    log.error("WBS import failed for project: {}", projectId, e);
                    WbsImportResult errorResult = new WbsImportResult();
                    errorResult.addError("Import failed: " + e.getMessage());
                    return Mono.just(ResponseEntity.internalServerError().body(errorResult));
                });
    }

    /**
     * Validate WBS Excel file without importing.
     *
     * @param projectId Project ID
     * @param file      Uploaded Excel file
     * @return Validation result
     */
    @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<WbsValidationResult>> validateWbs(
            @PathVariable String projectId,
            @RequestPart("file") FilePart file) {

        log.info("WBS validation requested for project: {}, file: {}", projectId, file.filename());

        // For validation, we can use a dry-run approach
        // This is a simplified validation that checks file format
        String filename = file.filename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            WbsValidationResult result = new WbsValidationResult(false, "Invalid file type");
            return Mono.just(ResponseEntity.badRequest().body(result));
        }

        // Return success for valid file format
        // Full validation would require parsing the file
        WbsValidationResult result = new WbsValidationResult(true, "File format is valid");
        return Mono.just(ResponseEntity.ok(result));
    }

    private String generateFilename(String prefix, String projectId) {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String shortProjectId = projectId.length() > 8 ? projectId.substring(0, 8) : projectId;
        return String.format("%s_%s_%s.xlsx", prefix, shortProjectId, date);
    }

    /**
     * Simple validation result DTO.
     */
    public record WbsValidationResult(boolean valid, String message) {}
}
