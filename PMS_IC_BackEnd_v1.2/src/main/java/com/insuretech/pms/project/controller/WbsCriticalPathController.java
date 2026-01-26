package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.CriticalPathResponse;
import com.insuretech.pms.project.service.WbsCriticalPathService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for Critical Path Method (CPM) analysis
 */
@Tag(name = "WBS Critical Path", description = "Critical Path Method Analysis API")
@RestController
@RequestMapping("/api/projects/{projectId}/wbs")
@RequiredArgsConstructor
public class WbsCriticalPathController {

    private final WbsCriticalPathService criticalPathService;

    @Operation(summary = "Calculate critical path for the project WBS")
    @GetMapping("/critical-path")
    @PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
    public ResponseEntity<ApiResponse<CriticalPathResponse>> getCriticalPath(
            @PathVariable String projectId) {
        CriticalPathResponse response = criticalPathService.calculateCriticalPath(projectId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Refresh critical path calculation (evict cache)")
    @PostMapping("/critical-path/refresh")
    @PreAuthorize("@projectSecurity.hasAnyRole(#projectId, 'PM', 'DEVELOPER')")
    public ResponseEntity<ApiResponse<CriticalPathResponse>> refreshCriticalPath(
            @PathVariable String projectId) {
        // Evict cache first
        criticalPathService.evictCriticalPathCache(projectId);
        // Then recalculate
        CriticalPathResponse response = criticalPathService.calculateCriticalPath(projectId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
