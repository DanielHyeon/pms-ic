package com.insuretech.pms.report.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.ReportSettingsDto;
import com.insuretech.pms.report.service.ReportSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for user report settings management
 */
@Tag(name = "Report Settings", description = "User report settings API")
@RestController
@RequestMapping("/api/report-settings")
@RequiredArgsConstructor
public class ReportSettingsController {

    private final ReportSettingsService settingsService;

    @Operation(summary = "Get user's report settings")
    @GetMapping
    public ResponseEntity<ApiResponse<ReportSettingsDto>> getUserSettings(
            @RequestHeader("X-User-Id") String userId,
            @Parameter(description = "Project ID for project-specific settings")
            @RequestParam(required = false) String projectId) {

        ReportSettingsDto settings = settingsService.getUserSettings(userId, projectId);
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    @Operation(summary = "Save user's report settings")
    @PostMapping
    public ResponseEntity<ApiResponse<ReportSettingsDto>> saveSettings(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody ReportSettingsDto dto) {

        ReportSettingsDto settings = settingsService.saveUserSettings(userId, dto);
        return ResponseEntity.ok(ApiResponse.success("Settings saved", settings));
    }

    @Operation(summary = "Delete user's settings for a project")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteSettings(
            @RequestHeader("X-User-Id") String userId,
            @Parameter(description = "Project ID to delete settings for")
            @RequestParam(required = false) String projectId) {

        settingsService.deleteUserSettings(userId, projectId);
        return ResponseEntity.ok(ApiResponse.success("Settings deleted", null));
    }

    @Operation(summary = "Toggle weekly reports on/off")
    @PostMapping("/weekly/toggle")
    public ResponseEntity<ApiResponse<ReportSettingsDto>> toggleWeeklyReports(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) String projectId,
            @RequestParam boolean enabled) {

        ReportSettingsDto settings = settingsService.toggleWeeklyReports(userId, projectId, enabled);
        return ResponseEntity.ok(ApiResponse.success(
                enabled ? "Weekly reports enabled" : "Weekly reports disabled",
                settings));
    }

    @Operation(summary = "Toggle monthly reports on/off")
    @PostMapping("/monthly/toggle")
    public ResponseEntity<ApiResponse<ReportSettingsDto>> toggleMonthlyReports(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) String projectId,
            @RequestParam boolean enabled) {

        ReportSettingsDto settings = settingsService.toggleMonthlyReports(userId, projectId, enabled);
        return ResponseEntity.ok(ApiResponse.success(
                enabled ? "Monthly reports enabled" : "Monthly reports disabled",
                settings));
    }
}
