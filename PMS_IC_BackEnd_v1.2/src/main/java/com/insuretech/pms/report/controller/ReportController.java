package com.insuretech.pms.report.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.ReportDto;
import com.insuretech.pms.report.dto.ReportGenerationRequest;
import com.insuretech.pms.report.dto.ReportOptionsDto;
import com.insuretech.pms.report.entity.ReportStatus;
import com.insuretech.pms.report.entity.ReportType;
import com.insuretech.pms.report.service.ReportGenerationService;
import com.insuretech.pms.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Controller for report management
 */
@Tag(name = "Reports", description = "Report management API")
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ReportGenerationService generationService;

    @Operation(summary = "Generate a new report")
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ReportDto>> generateReport(
            @Valid @RequestBody ReportGenerationRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String userRole) {

        ReportDto report = generationService.generateReport(request, userId, userRole);
        return ResponseEntity.ok(ApiResponse.success("Report generated successfully", report));
    }

    @Operation(summary = "Get report by ID")
    @GetMapping("/{reportId}")
    public ResponseEntity<ApiResponse<ReportDto>> getReportById(
            @PathVariable UUID reportId,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String userRole) {

        ReportDto report = reportService.getReportById(reportId, userId, userRole);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @Operation(summary = "Get reports for a project")
    @GetMapping("/project/{projectId}")
    public ResponseEntity<ApiResponse<Page<ReportDto>>> getProjectReports(
            @PathVariable String projectId,
            @RequestParam(required = false) ReportType reportType,
            @RequestParam(required = false) ReportStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String userRole,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<ReportDto> reports = reportService.getProjectReports(
                projectId, reportType, status, userId, userRole, pageable);
        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @Operation(summary = "Get my reports")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<ReportDto>>> getMyReports(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) ReportType reportType,
            @RequestParam(required = false) ReportStatus status,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<ReportDto> reports = reportService.getMyReports(userId, reportType, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @Operation(summary = "Update report content")
    @PutMapping("/{reportId}")
    public ResponseEntity<ApiResponse<ReportDto>> updateReport(
            @PathVariable UUID reportId,
            @RequestBody Map<String, Object> content,
            @RequestHeader("X-User-Id") String userId) {

        ReportDto report = reportService.updateReportContent(reportId, content, userId);
        return ResponseEntity.ok(ApiResponse.success("Report updated", report));
    }

    @Operation(summary = "Publish a report")
    @PostMapping("/{reportId}/publish")
    public ResponseEntity<ApiResponse<ReportDto>> publishReport(
            @PathVariable UUID reportId,
            @RequestHeader("X-User-Id") String userId) {

        ReportDto report = reportService.publishReport(reportId, userId);
        return ResponseEntity.ok(ApiResponse.success("Report published", report));
    }

    @Operation(summary = "Archive a report")
    @PostMapping("/{reportId}/archive")
    public ResponseEntity<ApiResponse<ReportDto>> archiveReport(
            @PathVariable UUID reportId,
            @RequestHeader("X-User-Id") String userId) {

        ReportDto report = reportService.archiveReport(reportId, userId);
        return ResponseEntity.ok(ApiResponse.success("Report archived", report));
    }

    @Operation(summary = "Delete a report")
    @DeleteMapping("/{reportId}")
    public ResponseEntity<ApiResponse<Void>> deleteReport(
            @PathVariable UUID reportId,
            @RequestHeader("X-User-Id") String userId) {

        reportService.deleteReport(reportId, userId);
        return ResponseEntity.ok(ApiResponse.success("Report deleted", null));
    }

    @Operation(summary = "Get report generation options for current user")
    @GetMapping("/options")
    public ResponseEntity<ApiResponse<ReportOptionsDto>> getReportOptions(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String userRole,
            @RequestParam(required = false) String projectId) {

        ReportOptionsDto options = reportService.getReportOptions(userId, userRole, projectId);
        return ResponseEntity.ok(ApiResponse.success(options));
    }

    @Operation(summary = "Get report history for a scope")
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Page<ReportDto>>> getReportHistory(
            @Parameter(description = "Project ID") @RequestParam String projectId,
            @Parameter(description = "Scope type (project, team, individual)") @RequestParam(required = false) String scope,
            @Parameter(description = "Scope entity ID (team ID or user ID)") @RequestParam(required = false) String scopeId,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String userRole,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<ReportDto> reports = reportService.getReportHistory(
                projectId, scope, scopeId, userId, userRole, pageable);
        return ResponseEntity.ok(ApiResponse.success(reports));
    }
}
