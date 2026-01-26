package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.service.DbAdminService;
import com.insuretech.pms.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for Database Administration.
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
public class DbAdminController {

    private final DbAdminService dbAdminService;

    // ============================================
    // Sync Endpoints
    // ============================================

    /**
     * Trigger PostgreSQL to Neo4j synchronization
     */
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerSync(
            @RequestBody(required = false) SyncRequest request,
            Authentication authentication) {
        String syncType = request != null ? request.getSyncType() : "full";
        String username = authentication != null ? authentication.getName() : "admin";

        log.info("Triggering {} sync by user: {}", syncType, username);
        Map<String, Object> result = dbAdminService.triggerSync(syncType, username);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Get current sync status
     */
    @GetMapping("/sync/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSyncStatus() {
        Map<String, Object> result = dbAdminService.getSyncStatus();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Get sync history
     */
    @GetMapping("/sync/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSyncHistory(
            @RequestParam(defaultValue = "10") int limit) {
        Map<String, Object> result = dbAdminService.getSyncHistory(limit);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ============================================
    // Backup Endpoints
    // ============================================

    /**
     * Create a database backup
     */
    @PostMapping("/backup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBackup(
            @RequestBody(required = false) BackupRequest request,
            Authentication authentication) {
        String backupType = request != null ? request.getBackupType() : "FULL";
        String username = authentication != null ? authentication.getName() : "admin";

        log.info("Creating {} backup by user: {}", backupType, username);
        Map<String, Object> result = dbAdminService.createBackup(backupType, username);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Get current backup status
     */
    @GetMapping("/backup/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBackupStatus() {
        Map<String, Object> result = dbAdminService.getBackupStatus();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * List all backups
     */
    @GetMapping("/backups")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listBackups(
            @RequestParam(defaultValue = "20") int limit) {
        Map<String, Object> result = dbAdminService.listBackups(limit);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Restore from a backup
     */
    @PostMapping("/restore/{backupId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> restoreBackup(
            @PathVariable String backupId,
            @RequestBody RestoreRequest request) {
        if (!request.isConfirm()) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.error("Confirmation required. Set confirm=true")
            );
        }

        log.warn("Restoring backup: {}", backupId);
        Map<String, Object> result = dbAdminService.restoreBackup(backupId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Delete a backup
     */
    @DeleteMapping("/backups/{backupId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteBackup(
            @PathVariable String backupId) {
        log.info("Deleting backup: {}", backupId);
        Map<String, Object> result = dbAdminService.deleteBackup(backupId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ============================================
    // Statistics Endpoint
    // ============================================

    /**
     * Get database statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDatabaseStats() {
        Map<String, Object> result = dbAdminService.getDatabaseStats();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ============================================
    // Request DTOs
    // ============================================

    @lombok.Data
    public static class SyncRequest {
        private String syncType = "full";  // full, incremental
    }

    @lombok.Data
    public static class BackupRequest {
        private String backupType = "FULL";  // POSTGRES, NEO4J, FULL
    }

    @lombok.Data
    public static class RestoreRequest {
        private boolean confirm;
    }
}
