package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.service.ReactiveDbAdminService;
import com.insuretech.pms.common.dto.ApiResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Reactive Controller for Database Administration.
 * Provides endpoints for:
 * - Neo4j synchronization (full/incremental)
 * - Database backup and restore
 * - Database statistics
 *
 * Only accessible by ADMIN and PMO_HEAD roles.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/db")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasRole('PMO_HEAD')")
public class ReactiveDbAdminController {

    private final ReactiveDbAdminService dbAdminService;

    // ============================================
    // Sync Endpoints
    // ============================================

    /**
     * Trigger PostgreSQL to Neo4j synchronization
     */
    @PostMapping("/sync")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> triggerSync(
            @RequestBody(required = false) SyncRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String syncType = request != null ? request.getSyncType() : "full";
        String username = userDetails != null ? userDetails.getUsername() : "admin";

        log.info("Triggering {} sync by user: {}", syncType, username);

        return dbAdminService.triggerSync(syncType, username)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    /**
     * Get current sync status
     */
    @GetMapping("/sync/status")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> getSyncStatus() {
        return dbAdminService.getSyncStatus()
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    /**
     * Get sync history
     */
    @GetMapping("/sync/history")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> getSyncHistory(
            @RequestParam(defaultValue = "10") int limit) {
        return dbAdminService.getSyncHistory(limit)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    // ============================================
    // Backup Endpoints
    // ============================================

    /**
     * Create a database backup
     */
    @PostMapping("/backup")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> createBackup(
            @RequestBody(required = false) BackupRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String backupType = request != null ? request.getBackupType() : "FULL";
        String username = userDetails != null ? userDetails.getUsername() : "admin";

        log.info("Creating {} backup by user: {}", backupType, username);

        return dbAdminService.createBackup(backupType, username)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    /**
     * Get current backup status
     */
    @GetMapping("/backup/status")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> getBackupStatus() {
        return dbAdminService.getBackupStatus()
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    /**
     * List all backups
     */
    @GetMapping("/backups")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> listBackups(
            @RequestParam(defaultValue = "20") int limit) {
        return dbAdminService.listBackups(limit)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    /**
     * Restore from a backup
     */
    @PostMapping("/restore/{backupId}")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> restoreBackup(
            @PathVariable String backupId,
            @RequestBody RestoreRequest request) {
        if (!request.isConfirm()) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error("Confirmation required. Set confirm=true")));
        }

        log.warn("Restoring backup: {}", backupId);

        return dbAdminService.restoreBackup(backupId)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    /**
     * Delete a backup
     */
    @DeleteMapping("/backups/{backupId}")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> deleteBackup(
            @PathVariable String backupId) {
        log.info("Deleting backup: {}", backupId);

        return dbAdminService.deleteBackup(backupId)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    // ============================================
    // Statistics Endpoint
    // ============================================

    /**
     * Get database statistics
     */
    @GetMapping("/stats")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> getDatabaseStats() {
        return dbAdminService.getDatabaseStats()
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    // ============================================
    // Request DTOs
    // ============================================

    @Data
    public static class SyncRequest {
        private String syncType = "full";  // full, incremental
    }

    @Data
    public static class BackupRequest {
        private String backupType = "FULL";  // POSTGRES, NEO4J, FULL
    }

    @Data
    public static class RestoreRequest {
        private boolean confirm;
    }
}
