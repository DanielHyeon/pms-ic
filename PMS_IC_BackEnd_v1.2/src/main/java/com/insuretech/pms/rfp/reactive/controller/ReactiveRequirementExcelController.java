package com.insuretech.pms.rfp.reactive.controller;

import com.insuretech.pms.rfp.reactive.service.ReactiveRequirementExcelService;
import com.insuretech.pms.rfp.reactive.service.ReactiveRequirementExcelService.RequirementImportResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Reactive REST Controller for Requirement Excel import/export operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/projects/{projectId}/requirements/excel")
@RequiredArgsConstructor
public class ReactiveRequirementExcelController {

    private final ReactiveRequirementExcelService requirementExcelService;

    private static final String EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /**
     * Export requirements to Excel file for a project.
     *
     * @param projectId Project ID
     * @return Excel file as downloadable resource
     */
    @GetMapping("/export")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<Resource>> exportRequirements(@PathVariable String projectId) {
        log.info("Requirement export requested for project: {}", projectId);

        String filename = generateFilename("Requirements_Export", projectId);

        return requirementExcelService.exportToExcel(projectId)
                .map(resource -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .body(resource))
                .doOnSuccess(r -> log.info("Requirement export completed for project: {}", projectId))
                .onErrorResume(e -> {
                    log.error("Requirement export failed for project: {}", projectId, e);
                    return Mono.just(ResponseEntity.internalServerError().build());
                });
    }

    /**
     * Export requirements by RFP to Excel file.
     *
     * @param projectId Project ID (for URL consistency)
     * @param rfpId     RFP ID
     * @return Excel file as downloadable resource
     */
    @GetMapping("/export/rfp/{rfpId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<Resource>> exportRequirementsByRfp(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        log.info("Requirement export by RFP requested: projectId={}, rfpId={}", projectId, rfpId);

        String filename = generateFilename("Requirements_RFP", rfpId);

        return requirementExcelService.exportByRfpToExcel(rfpId)
                .map(resource -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .body(resource))
                .doOnSuccess(r -> log.info("Requirement export by RFP completed: {}", rfpId))
                .onErrorResume(e -> {
                    log.error("Requirement export by RFP failed: {}", rfpId, e);
                    return Mono.just(ResponseEntity.internalServerError().build());
                });
    }

    /**
     * Download requirement import template.
     *
     * @return Excel template file
     */
    @GetMapping("/template")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<Resource>> downloadTemplate() {
        log.info("Requirement template download requested");

        String filename = "Requirements_Template.xlsx";

        return requirementExcelService.generateTemplate()
                .map(resource -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .body(resource))
                .doOnSuccess(r -> log.info("Requirement template generated successfully"))
                .onErrorResume(e -> {
                    log.error("Requirement template generation failed", e);
                    return Mono.just(ResponseEntity.internalServerError().build());
                });
    }

    /**
     * Import requirements from Excel file.
     *
     * @param projectId   Project ID
     * @param file        Uploaded Excel file
     * @param rfpId       Optional RFP ID to associate requirements with
     * @param userDetails Authenticated user details
     * @return Import result with statistics
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD', 'PM', 'BUSINESS_ANALYST')")
    public Mono<ResponseEntity<RequirementImportResult>> importRequirements(
            @PathVariable String projectId,
            @RequestPart("file") FilePart file,
            @RequestParam(value = "rfpId", required = false) String rfpId,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Requirement import requested for project: {}, file: {}, rfpId: {}",
                projectId, file.filename(), rfpId);

        // Validate file extension
        String filename = file.filename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            RequirementImportResult errorResult = new RequirementImportResult();
            errorResult.addError("Invalid file type. Please upload an Excel file (.xlsx or .xls)");
            return Mono.just(ResponseEntity.badRequest().body(errorResult));
        }

        // Use project ID as tenant ID for this context
        String tenantId = projectId;

        return requirementExcelService.importFromExcel(file, projectId, rfpId, tenantId)
                .map(result -> {
                    if (result.getErrors().isEmpty()) {
                        log.info("Requirement import successful for project: {}. Created: {}, Updated: {}",
                                projectId, result.getCreated(), result.getUpdated());
                        return ResponseEntity.ok(result);
                    } else {
                        log.warn("Requirement import completed with errors for project: {}. Errors: {}",
                                projectId, result.getErrors().size());
                        return ResponseEntity.ok(result);
                    }
                })
                .onErrorResume(e -> {
                    log.error("Requirement import failed for project: {}", projectId, e);
                    RequirementImportResult errorResult = new RequirementImportResult();
                    errorResult.addError("Import failed: " + e.getMessage());
                    return Mono.just(ResponseEntity.internalServerError().body(errorResult));
                });
    }

    /**
     * Validate requirement Excel file without importing.
     *
     * @param projectId Project ID
     * @param file      Uploaded Excel file
     * @return Validation result
     */
    @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD', 'PM', 'BUSINESS_ANALYST')")
    public Mono<ResponseEntity<ValidationResult>> validateRequirements(
            @PathVariable String projectId,
            @RequestPart("file") FilePart file) {

        log.info("Requirement validation requested for project: {}, file: {}", projectId, file.filename());

        // Validate file extension
        String filename = file.filename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            ValidationResult result = new ValidationResult(false, "Invalid file type. Upload .xlsx or .xls file.");
            return Mono.just(ResponseEntity.badRequest().body(result));
        }

        // Return success for valid file format
        ValidationResult result = new ValidationResult(true, "File format is valid");
        return Mono.just(ResponseEntity.ok(result));
    }

    /**
     * Get import statistics for recent imports.
     *
     * @param projectId Project ID
     * @return Import statistics summary
     */
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ImportStats>> getImportStats(@PathVariable String projectId) {
        log.info("Import stats requested for project: {}", projectId);

        // This is a placeholder - in a real implementation, you would track import history
        ImportStats stats = new ImportStats(projectId, 0, 0, 0);
        return Mono.just(ResponseEntity.ok(stats));
    }

    private String generateFilename(String prefix, String identifier) {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String shortId = identifier.length() > 8 ? identifier.substring(0, 8) : identifier;
        return String.format("%s_%s_%s.xlsx", prefix, shortId, date);
    }

    /**
     * Simple validation result DTO.
     */
    public record ValidationResult(boolean valid, String message) {}

    /**
     * Import statistics DTO.
     */
    public record ImportStats(
            String projectId,
            int totalImports,
            int totalRequirementsCreated,
            int totalRequirementsUpdated
    ) {}
}
