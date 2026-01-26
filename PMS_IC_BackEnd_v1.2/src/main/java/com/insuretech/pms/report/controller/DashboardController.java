package com.insuretech.pms.report.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.ActivityDto;
import com.insuretech.pms.report.dto.DashboardStats;
import com.insuretech.pms.report.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Portfolio Dashboard Controller.
 * Provides aggregated dashboard statistics for user's accessible projects.
 */
@Tag(name = "Dashboard", description = "Portfolio Dashboard API")
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "Portfolio 대시보드 통계 조회",
               description = "로그인 사용자가 접근 가능한 프로젝트들의 집계 통계를 반환합니다.")
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DashboardStats>> getPortfolioStats() {
        DashboardStats stats = dashboardService.getPortfolioStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @Operation(summary = "Portfolio 최근 활동 조회",
               description = "로그인 사용자가 접근 가능한 프로젝트들의 최근 활동을 반환합니다.")
    @GetMapping("/activities")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ActivityDto>>> getPortfolioActivities() {
        List<ActivityDto> activities = dashboardService.getPortfolioActivities();
        return ResponseEntity.ok(ApiResponse.success(activities));
    }
}
