package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.DashboardStats;
import com.insuretech.pms.report.dto.WeightedProgressDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Reactive REST Controller for dashboard statistics.
 * Provides portfolio-wide and project-specific dashboard data.
 */
@Slf4j
@RestController
@RequestMapping("/api/v2")
@RequiredArgsConstructor
public class ReactiveDashboardController {

    // ========== Portfolio Dashboard (aggregated across all projects) ==========

    @GetMapping("/dashboard/stats")
    public Mono<ResponseEntity<ApiResponse<DashboardStats>>> getPortfolioDashboardStats() {
        log.debug("Getting portfolio dashboard stats");

        DashboardStats stats = DashboardStats.builder()
                .isPortfolioView(true)
                .projectId(null)
                .projectName(null)
                .totalProjects(5L)
                .activeProjects(3L)
                .totalTasks(230L)
                .completedTasks(142L)
                .avgProgress(62)
                .projectsByStatus(Map.of(
                        "PLANNING", 1L,
                        "IN_PROGRESS", 3L,
                        "ON_HOLD", 0L,
                        "COMPLETED", 1L,
                        "CANCELLED", 0L
                ))
                .build();

        return Mono.just(ResponseEntity.ok(ApiResponse.success(stats)));
    }

    @GetMapping("/dashboard/activities")
    public Mono<ResponseEntity<ApiResponse<List<ActivityDto>>>> getPortfolioActivities() {
        log.debug("Getting portfolio activities");

        List<ActivityDto> activities = List.of(
                ActivityDto.builder()
                        .user("박민수")
                        .action("OCR 모델 v2.1 성능 테스트 완료")
                        .time("5분 전")
                        .type("success")
                        .projectId("proj-001")
                        .projectName("AI 보험심사 처리 시스템")
                        .build(),
                ActivityDto.builder()
                        .user("이영희")
                        .action("데이터 비식별화 문서 승인 요청")
                        .time("1시간 전")
                        .type("info")
                        .projectId("proj-001")
                        .projectName("AI 보험심사 처리 시스템")
                        .build(),
                ActivityDto.builder()
                        .user("AI 어시스턴트")
                        .action("일정 지연 위험 감지 알림 발송")
                        .time("2시간 전")
                        .type("warning")
                        .projectId("proj-002")
                        .projectName("모바일 보험 플랫폼")
                        .build()
        );

        return Mono.just(ResponseEntity.ok(ApiResponse.success(activities)));
    }

    // ========== Project-specific Dashboard ==========

    @GetMapping("/projects/{projectId}/dashboard/stats")
    public Mono<ResponseEntity<ApiResponse<DashboardStats>>> getProjectDashboardStats(
            @PathVariable String projectId) {
        log.debug("Getting dashboard stats for project: {}", projectId);

        String projectName = projectId.equals("proj-001")
                ? "AI 보험심사 처리 시스템"
                : "모바일 보험 플랫폼";

        DashboardStats stats = DashboardStats.builder()
                .isPortfolioView(false)
                .projectId(projectId)
                .projectName(projectName)
                .totalProjects(1L)
                .activeProjects(1L)
                .totalTasks(50L)
                .completedTasks(32L)
                .avgProgress(64)
                .projectsByStatus(Map.of("IN_PROGRESS", 1L))
                .build();

        return Mono.just(ResponseEntity.ok(ApiResponse.success(stats)));
    }

    @GetMapping("/projects/{projectId}/dashboard/activities")
    public Mono<ResponseEntity<ApiResponse<List<ActivityDto>>>> getProjectActivities(
            @PathVariable String projectId) {
        log.debug("Getting activities for project: {}", projectId);

        String projectName = projectId.equals("proj-001")
                ? "AI 보험심사 처리 시스템"
                : "모바일 보험 플랫폼";

        List<ActivityDto> activities = List.of(
                ActivityDto.builder()
                        .user("박민수")
                        .action("OCR 모델 v2.1 성능 테스트 완료")
                        .time("5분 전")
                        .type("success")
                        .projectId(projectId)
                        .projectName(projectName)
                        .build(),
                ActivityDto.builder()
                        .user("이영희")
                        .action("데이터 비식별화 문서 승인 요청")
                        .time("1시간 전")
                        .type("info")
                        .projectId(projectId)
                        .projectName(projectName)
                        .build()
        );

        return Mono.just(ResponseEntity.ok(ApiResponse.success(activities)));
    }

    @GetMapping("/projects/{projectId}/dashboard/weighted-progress")
    public Mono<ResponseEntity<ApiResponse<WeightedProgressDto>>> getWeightedProgress(
            @PathVariable String projectId) {
        log.debug("Getting weighted progress for project: {}", projectId);

        WeightedProgressDto progress = WeightedProgressDto.builder()
                .aiProgress(45.5)
                .siProgress(60.0)
                .commonProgress(30.0)
                .weightedProgress(49.85)
                .aiWeight(new BigDecimal("0.70"))
                .siWeight(new BigDecimal("0.30"))
                .commonWeight(new BigDecimal("0.00"))
                .aiTotalTasks(22L)
                .aiCompletedTasks(10L)
                .siTotalTasks(15L)
                .siCompletedTasks(9L)
                .commonTotalTasks(10L)
                .commonCompletedTasks(3L)
                .totalTasks(47L)
                .completedTasks(22L)
                .build();

        return Mono.just(ResponseEntity.ok(ApiResponse.success(progress)));
    }

    // ========== Activity DTO ==========

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ActivityDto {
        private String user;
        private String action;
        private String time;
        private String type;
        private String projectId;
        private String projectName;
    }
}
