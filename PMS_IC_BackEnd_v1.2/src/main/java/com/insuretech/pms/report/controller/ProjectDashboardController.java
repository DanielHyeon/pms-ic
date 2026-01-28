package com.insuretech.pms.report.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.ActivityDto;
import com.insuretech.pms.report.dto.DashboardStats;
import com.insuretech.pms.report.dto.WeightedProgressDto;
import com.insuretech.pms.report.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Project-specific Dashboard Controller.
 * Provides dashboard statistics for a specific project.
 * Requires project membership for access.
 */
@Tag(name = "Project Dashboard", description = "Project-specific Dashboard API")
@RestController
@RequestMapping("/api/projects/{projectId}/dashboard")
@RequiredArgsConstructor
public class ProjectDashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "프로젝트 대시보드 통계 조회",
               description = "특정 프로젝트의 대시보드 통계를 반환합니다. 프로젝트 멤버만 접근 가능합니다.")
    @GetMapping("/stats")
    @PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
    public ResponseEntity<ApiResponse<DashboardStats>> getProjectStats(
            @Parameter(description = "프로젝트 ID") @PathVariable String projectId) {
        DashboardStats stats = dashboardService.getProjectStats(projectId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @Operation(summary = "프로젝트 최근 활동 조회",
               description = "특정 프로젝트의 최근 활동을 반환합니다. 프로젝트 멤버만 접근 가능합니다.")
    @GetMapping("/activities")
    @PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
    public ResponseEntity<ApiResponse<List<ActivityDto>>> getProjectActivities(
            @Parameter(description = "프로젝트 ID") @PathVariable String projectId) {
        List<ActivityDto> activities = dashboardService.getProjectActivities(projectId);
        return ResponseEntity.ok(ApiResponse.success(activities));
    }

    @Operation(summary = "프로젝트 가중치 기반 진척율 조회",
               description = "AI/SI/Common 트랙별 가중치를 적용한 통합 진척율을 반환합니다. 프로젝트 멤버만 접근 가능합니다.")
    @GetMapping("/weighted-progress")
    @PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
    public ResponseEntity<ApiResponse<WeightedProgressDto>> getWeightedProgress(
            @Parameter(description = "프로젝트 ID") @PathVariable String projectId) {
        WeightedProgressDto progress = dashboardService.getWeightedProgress(projectId);
        return ResponseEntity.ok(ApiResponse.success(progress));
    }
}
