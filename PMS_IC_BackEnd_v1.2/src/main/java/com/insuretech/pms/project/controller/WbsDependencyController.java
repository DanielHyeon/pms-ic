package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.CreateWbsDependencyRequest;
import com.insuretech.pms.project.dto.WbsDependencyDto;
import com.insuretech.pms.project.service.WbsDependencyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "WBS Dependencies", description = "WBS Dependency Management API")
@RestController
@RequestMapping("/api/projects/{projectId}/wbs/dependencies")
@RequiredArgsConstructor
public class WbsDependencyController {

    private final WbsDependencyService dependencyService;

    @Operation(summary = "Get all WBS dependencies for a project")
    @GetMapping
    @PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
    public ResponseEntity<ApiResponse<List<WbsDependencyDto>>> getDependencies(
            @PathVariable String projectId) {
        List<WbsDependencyDto> dependencies = dependencyService.getProjectDependencies(projectId);
        return ResponseEntity.ok(ApiResponse.success(dependencies));
    }

    @Operation(summary = "Get a specific WBS dependency")
    @GetMapping("/{dependencyId}")
    @PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
    public ResponseEntity<ApiResponse<WbsDependencyDto>> getDependency(
            @PathVariable String projectId,
            @PathVariable String dependencyId) {
        WbsDependencyDto dependency = dependencyService.getDependency(dependencyId);
        return ResponseEntity.ok(ApiResponse.success(dependency));
    }

    @Operation(summary = "Create a new WBS dependency")
    @PostMapping
    @PreAuthorize("@projectSecurity.hasAnyRole(#projectId, 'PM', 'DEVELOPER')")
    public ResponseEntity<ApiResponse<WbsDependencyDto>> createDependency(
            @PathVariable String projectId,
            @Valid @RequestBody CreateWbsDependencyRequest request) {
        WbsDependencyDto created = dependencyService.createDependency(projectId, request);
        return ResponseEntity.ok(ApiResponse.success(created));
    }

    @Operation(summary = "Delete a WBS dependency")
    @DeleteMapping("/{dependencyId}")
    @PreAuthorize("@projectSecurity.hasAnyRole(#projectId, 'PM', 'DEVELOPER')")
    public ResponseEntity<ApiResponse<Void>> deleteDependency(
            @PathVariable String projectId,
            @PathVariable String dependencyId) {
        dependencyService.deleteDependency(dependencyId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Get dependencies for a specific WBS item")
    @GetMapping("/item/{itemId}")
    @PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
    public ResponseEntity<ApiResponse<List<WbsDependencyDto>>> getDependenciesForItem(
            @PathVariable String projectId,
            @PathVariable String itemId) {
        List<WbsDependencyDto> dependencies = dependencyService.getDependenciesForItem(itemId);
        return ResponseEntity.ok(ApiResponse.success(dependencies));
    }
}
