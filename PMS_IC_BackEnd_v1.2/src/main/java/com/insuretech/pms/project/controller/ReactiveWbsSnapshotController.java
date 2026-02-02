package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.CreateWbsSnapshotRequest;
import com.insuretech.pms.project.dto.WbsSnapshotDto;
import com.insuretech.pms.project.service.ReactiveWbsSnapshotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Reactive REST Controller for WBS Snapshot (backup/restore) operations
 */
@Tag(name = "WBS Snapshots", description = "WBS Backup and Restore API")
@RestController
@RequestMapping("/api/wbs-snapshots")
@RequiredArgsConstructor
public class ReactiveWbsSnapshotController {

    private final ReactiveWbsSnapshotService snapshotService;

    @Operation(summary = "Create a WBS snapshot for a phase")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsSnapshotDto>>> createSnapshot(
            @Valid @RequestBody CreateWbsSnapshotRequest request) {
        return snapshotService.createSnapshot(request)
                .map(snapshot -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Snapshot created successfully", snapshot)));
    }

    @Operation(summary = "Get all snapshots for a phase")
    @GetMapping("/phase/{phaseId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<WbsSnapshotDto>>>> getSnapshotsByPhase(
            @PathVariable String phaseId) {
        return snapshotService.getSnapshotsByPhase(phaseId)
                .collectList()
                .map(snapshots -> ResponseEntity.ok(ApiResponse.success(snapshots)));
    }

    @Operation(summary = "Get all snapshots for a project")
    @GetMapping("/project/{projectId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<WbsSnapshotDto>>>> getSnapshotsByProject(
            @PathVariable String projectId) {
        return snapshotService.getSnapshotsByProject(projectId)
                .collectList()
                .map(snapshots -> ResponseEntity.ok(ApiResponse.success(snapshots)));
    }

    @Operation(summary = "Get a specific snapshot")
    @GetMapping("/{snapshotId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsSnapshotDto>>> getSnapshot(
            @PathVariable String snapshotId) {
        return snapshotService.getSnapshot(snapshotId)
                .map(snapshot -> ResponseEntity.ok(ApiResponse.success(snapshot)));
    }

    @Operation(summary = "Restore WBS data from a snapshot")
    @PostMapping("/{snapshotId}/restore")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> restoreSnapshot(
            @PathVariable String snapshotId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "anonymous";
        return snapshotService.restoreSnapshot(snapshotId, username)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Snapshot restored successfully", null))));
    }

    @Operation(summary = "Delete a WBS snapshot (soft delete)")
    @DeleteMapping("/{snapshotId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteSnapshot(
            @PathVariable String snapshotId) {
        return snapshotService.deleteSnapshot(snapshotId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Snapshot deleted successfully", null))));
    }

    @Operation(summary = "Permanently delete a WBS snapshot and all its data")
    @DeleteMapping("/{snapshotId}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Void>>> hardDeleteSnapshot(
            @PathVariable String snapshotId) {
        return snapshotService.hardDeleteSnapshot(snapshotId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Snapshot permanently deleted", null))));
    }
}
