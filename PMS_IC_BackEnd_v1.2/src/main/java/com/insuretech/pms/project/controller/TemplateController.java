package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.TemplateSetDto;
import com.insuretech.pms.project.service.TemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Templates", description = "Phase/WBS Template management API")
@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @Operation(summary = "Get all active template sets")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TemplateSetDto>>> getAllTemplateSets() {
        return ResponseEntity.ok(ApiResponse.success(templateService.getAllTemplateSets()));
    }

    @Operation(summary = "Get template sets by category")
    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<TemplateSetDto>>> getTemplateSetsByCategory(
            @PathVariable String category) {
        return ResponseEntity.ok(ApiResponse.success(templateService.getTemplateSetsByCategory(category)));
    }

    @Operation(summary = "Get template set by ID with full details")
    @GetMapping("/{templateSetId}")
    public ResponseEntity<ApiResponse<TemplateSetDto>> getTemplateSet(@PathVariable String templateSetId) {
        return ResponseEntity.ok(ApiResponse.success(templateService.getTemplateSetById(templateSetId)));
    }

    @Operation(summary = "Create a new template set")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<TemplateSetDto>> createTemplateSet(
            @Valid @RequestBody TemplateSetDto request) {
        TemplateSetDto created = templateService.createTemplateSet(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Template Set created successfully", created));
    }

    @Operation(summary = "Delete a template set")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'ADMIN')")
    @DeleteMapping("/{templateSetId}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplateSet(@PathVariable String templateSetId) {
        templateService.deleteTemplateSet(templateSetId);
        return ResponseEntity.ok(ApiResponse.success("Template Set deleted successfully", null));
    }

    @Operation(summary = "Apply template to a project")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping("/{templateSetId}/apply")
    public ResponseEntity<ApiResponse<Void>> applyTemplateToProject(
            @PathVariable String templateSetId,
            @RequestParam String projectId,
            @RequestParam(required = false) LocalDate startDate) {
        templateService.applyTemplateToProject(templateSetId, projectId, startDate);
        return ResponseEntity.ok(ApiResponse.success("Template applied to project successfully", null));
    }
}
