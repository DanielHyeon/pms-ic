package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.CreateWbsSnapshotRequest;
import com.insuretech.pms.project.dto.WbsSnapshotDto;
import com.insuretech.pms.project.service.WbsSnapshotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for WBS Snapshot (backup/restore) operations
 */
@Tag(name = "WBS Snapshots", description = "WBS Backup and Restore API")
@RestController
@RequestMapping("/api/wbs-snapshots")
@RequiredArgsConstructor
public class WbsSnapshotController {

    private final WbsSnapshotService snapshotService;

    @Operation(summary = "Create a WBS snapshot for a phase")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<WbsSnapshotDto>> createSnapshot(
            @Valid @RequestBody CreateWbsSnapshotRequest request) {
        WbsSnapshotDto snapshot = snapshotService.createSnapshot(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Snapshot created successfully", snapshot));
    }

    @Operation(summary = "Get all snapshots for a phase")
    @GetMapping("/phase/{phaseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<WbsSnapshotDto>>> getSnapshotsByPhase(
            @PathVariable String phaseId) {
        List<WbsSnapshotDto> snapshots = snapshotService.getSnapshotsByPhase(phaseId);
        return ResponseEntity.ok(ApiResponse.success(snapshots));
    }

    @Operation(summary = "Get all snapshots for a project")
    @GetMapping("/project/{projectId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<WbsSnapshotDto>>> getSnapshotsByProject(
            @PathVariable String projectId) {
        List<WbsSnapshotDto> snapshots = snapshotService.getSnapshotsByProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(snapshots));
    }

    @Operation(summary = "Get a specific snapshot")
    @GetMapping("/{snapshotId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<WbsSnapshotDto>> getSnapshot(
            @PathVariable String snapshotId) {
        WbsSnapshotDto snapshot = snapshotService.getSnapshot(snapshotId);
        return ResponseEntity.ok(ApiResponse.success(snapshot));
    }

    @Operation(summary = "Restore WBS data from a snapshot")
    @PostMapping("/{snapshotId}/restore")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> restoreSnapshot(
            @PathVariable String snapshotId) {
        snapshotService.restoreSnapshot(snapshotId);
        return ResponseEntity.ok(ApiResponse.success("Snapshot restored successfully", null));
    }

    @Operation(summary = "Delete a WBS snapshot (soft delete)")
    @DeleteMapping("/{snapshotId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteSnapshot(
            @PathVariable String snapshotId) {
        snapshotService.deleteSnapshot(snapshotId);
        return ResponseEntity.ok(ApiResponse.success("Snapshot deleted successfully", null));
    }

    @Operation(summary = "Permanently delete a WBS snapshot and all its data")
    @DeleteMapping("/{snapshotId}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> hardDeleteSnapshot(
            @PathVariable String snapshotId) {
        snapshotService.hardDeleteSnapshot(snapshotId);
        return ResponseEntity.ok(ApiResponse.success("Snapshot permanently deleted", null));
    }
}
