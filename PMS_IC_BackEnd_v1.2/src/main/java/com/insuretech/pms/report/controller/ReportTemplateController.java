package com.insuretech.pms.report.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.ReportTemplateDto;
import com.insuretech.pms.report.entity.ReportType;
import com.insuretech.pms.report.service.ReportTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller for report template management
 */
@Tag(name = "Report Templates", description = "Report template management API")
@RestController
@RequestMapping("/api/report-templates")
@RequiredArgsConstructor
public class ReportTemplateController {

    private final ReportTemplateService templateService;

    @Operation(summary = "Get template by ID")
    @GetMapping("/{templateId}")
    public ResponseEntity<ApiResponse<ReportTemplateDto>> getTemplateById(
            @PathVariable UUID templateId) {

        ReportTemplateDto template = templateService.getTemplateById(templateId);
        return ResponseEntity.ok(ApiResponse.success(template));
    }

    @Operation(summary = "Get all active templates")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportTemplateDto>>> getAllTemplates() {
        List<ReportTemplateDto> templates = templateService.getAllActiveTemplates();
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @Operation(summary = "Get templates by report type")
    @GetMapping("/type/{reportType}")
    public ResponseEntity<ApiResponse<List<ReportTemplateDto>>> getTemplatesByType(
            @PathVariable ReportType reportType) {

        List<ReportTemplateDto> templates = templateService.getTemplatesByType(reportType);
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @Operation(summary = "Get templates for a specific role")
    @GetMapping("/role/{role}")
    public ResponseEntity<ApiResponse<List<ReportTemplateDto>>> getTemplatesForRole(
            @PathVariable String role,
            @RequestParam(required = false) ReportType reportType) {

        ReportType type = reportType != null ? reportType : ReportType.WEEKLY;
        List<ReportTemplateDto> templates = templateService.getTemplatesForRole(role, type);
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @Operation(summary = "Get my personal templates")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ReportTemplateDto>>> getMyTemplates(
            @RequestHeader("X-User-Id") String userId) {

        List<ReportTemplateDto> templates = templateService.getPersonalTemplates(userId);
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @Operation(summary = "Get system templates")
    @GetMapping("/system")
    public ResponseEntity<ApiResponse<List<ReportTemplateDto>>> getSystemTemplates() {
        List<ReportTemplateDto> templates = templateService.getSystemTemplates();
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @Operation(summary = "Create a new template")
    @PostMapping
    public ResponseEntity<ApiResponse<ReportTemplateDto>> createTemplate(
            @Valid @RequestBody ReportTemplateDto dto,
            @RequestHeader("X-User-Id") String userId) {

        ReportTemplateDto template = templateService.createTemplate(dto, userId);
        return ResponseEntity.ok(ApiResponse.success("Template created", template));
    }

    @Operation(summary = "Update a template")
    @PutMapping("/{templateId}")
    public ResponseEntity<ApiResponse<ReportTemplateDto>> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody ReportTemplateDto dto,
            @RequestHeader("X-User-Id") String userId) {

        ReportTemplateDto template = templateService.updateTemplate(templateId, dto, userId);
        return ResponseEntity.ok(ApiResponse.success("Template updated", template));
    }

    @Operation(summary = "Copy a template")
    @PostMapping("/{templateId}/copy")
    public ResponseEntity<ApiResponse<ReportTemplateDto>> copyTemplate(
            @PathVariable UUID templateId,
            @Parameter(description = "New template name") @RequestParam(required = false) String newName,
            @RequestHeader("X-User-Id") String userId) {

        ReportTemplateDto template = templateService.copyTemplate(templateId, newName, userId);
        return ResponseEntity.ok(ApiResponse.success("Template copied", template));
    }

    @Operation(summary = "Delete a template")
    @DeleteMapping("/{templateId}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(
            @PathVariable UUID templateId,
            @RequestHeader("X-User-Id") String userId) {

        templateService.deleteTemplate(templateId, userId);
        return ResponseEntity.ok(ApiResponse.success("Template deleted", null));
    }

    @Operation(summary = "Deactivate a template (soft delete)")
    @PostMapping("/{templateId}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public ResponseEntity<ApiResponse<Void>> deactivateTemplate(
            @PathVariable UUID templateId,
            @RequestHeader("X-User-Id") String userId) {

        templateService.deactivateTemplate(templateId, userId);
        return ResponseEntity.ok(ApiResponse.success("Template deactivated", null));
    }
}
