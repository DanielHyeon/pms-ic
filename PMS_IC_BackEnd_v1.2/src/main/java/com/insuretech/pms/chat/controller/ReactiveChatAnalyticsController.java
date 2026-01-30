package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.dto.ChatAnalyticsDto.*;
import com.insuretech.pms.chat.service.ReactiveChatAnalyticsService;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

/**
 * REST controller for Chat Analytics API.
 * Provides endpoints for retrieving chat statistics, user engagement metrics,
 * and LLM engine usage data.
 */
@Tag(name = "Chat Analytics", description = "Chat analytics and statistics API")
@RestController
@RequestMapping("/api/v1/chat/analytics")
@RequiredArgsConstructor
@Slf4j
public class ReactiveChatAnalyticsController {

    private final ReactiveChatAnalyticsService analyticsService;

    /**
     * Get overall chat analytics summary.
     * Combines session statistics, user engagement, and engine usage into a single response.
     */
    @Operation(
            summary = "Get analytics summary",
            description = "Returns a comprehensive summary of chat analytics including session stats, " +
                    "user engagement metrics, and LLM engine usage data"
    )
    @GetMapping("/summary")
    @PreAuthorize("@reactiveProjectSecurity.hasAnySystemRole('ADMIN', 'AUDITOR')")
    public Mono<ApiResponse<AnalyticsSummary>> getAnalyticsSummary(
            @Parameter(description = "Start date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @Parameter(description = "End date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate) {

        AnalyticsFilter filter = buildFilter(startDate, endDate, null, null);
        log.info("Analytics summary request: start={}, end={}", filter.getStartDate(), filter.getEndDate());

        return analyticsService.getAnalyticsSummary(filter)
                .map(ApiResponse::success)
                .doOnSuccess(response -> log.debug("Analytics summary generated successfully"))
                .doOnError(error -> log.error("Failed to generate analytics summary: {}", error.getMessage()));
    }

    /**
     * Get detailed session-level statistics.
     * Includes total sessions, messages per session, top sessions, and daily breakdown.
     */
    @Operation(
            summary = "Get session statistics",
            description = "Returns detailed session-level statistics including session counts, " +
                    "message distributions, top sessions by activity, and daily session trends"
    )
    @GetMapping("/sessions")
    @PreAuthorize("@reactiveProjectSecurity.hasAnySystemRole('ADMIN', 'AUDITOR')")
    public Mono<ApiResponse<SessionStatistics>> getSessionStatistics(
            @Parameter(description = "Start date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @Parameter(description = "End date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate,

            @Parameter(description = "Maximum number of items to return in top lists")
            @RequestParam(required = false, defaultValue = "10")
            Integer limit) {

        AnalyticsFilter filter = buildFilter(startDate, endDate, limit, null);
        log.info("Session statistics request: start={}, end={}, limit={}",
                filter.getStartDate(), filter.getEndDate(), filter.getLimit());

        return analyticsService.getSessionStatistics(filter)
                .map(ApiResponse::success)
                .doOnSuccess(response -> log.debug("Session statistics generated successfully"))
                .doOnError(error -> log.error("Failed to generate session statistics: {}", error.getMessage()));
    }

    /**
     * Get user engagement statistics.
     * Includes active user counts, messages per user, top users, and activity trends.
     */
    @Operation(
            summary = "Get user engagement statistics",
            description = "Returns detailed user engagement metrics including active user counts, " +
                    "messages per user, top users by activity, and daily engagement trends"
    )
    @GetMapping("/users")
    @PreAuthorize("@reactiveProjectSecurity.hasAnySystemRole('ADMIN', 'AUDITOR')")
    public Mono<ApiResponse<UserEngagementStatistics>> getUserEngagementStatistics(
            @Parameter(description = "Start date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @Parameter(description = "End date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate,

            @Parameter(description = "Filter by specific user ID")
            @RequestParam(required = false)
            String userId,

            @Parameter(description = "Maximum number of items to return in top lists")
            @RequestParam(required = false, defaultValue = "10")
            Integer limit) {

        AnalyticsFilter filter = buildFilter(startDate, endDate, limit, userId);
        log.info("User engagement statistics request: start={}, end={}, userId={}, limit={}",
                filter.getStartDate(), filter.getEndDate(), filter.getUserId(), filter.getLimit());

        return analyticsService.getUserEngagementStatistics(filter)
                .map(ApiResponse::success)
                .doOnSuccess(response -> log.debug("User engagement statistics generated successfully"))
                .doOnError(error -> log.error("Failed to generate user engagement statistics: {}", error.getMessage()));
    }

    /**
     * Get LLM engine usage statistics.
     * Includes request counts by engine, success rates, response times, and error breakdowns.
     */
    @Operation(
            summary = "Get LLM engine usage statistics",
            description = "Returns detailed LLM engine usage statistics including request counts per engine, " +
                    "success rates, average response times, token usage, and error breakdowns"
    )
    @GetMapping("/engines")
    @PreAuthorize("@reactiveProjectSecurity.hasAnySystemRole('ADMIN', 'AUDITOR')")
    public Mono<ApiResponse<EngineStatistics>> getEngineStatistics(
            @Parameter(description = "Start date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @Parameter(description = "End date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate,

            @Parameter(description = "Filter by specific engine name (e.g., 'gguf', 'vllm')")
            @RequestParam(required = false)
            String engine) {

        AnalyticsFilter filter = AnalyticsFilter.builder()
                .startDate(startDate != null ? startDate : LocalDateTime.now().minusDays(30))
                .endDate(endDate != null ? endDate : LocalDateTime.now())
                .engine(engine)
                .limit(100)
                .offset(0)
                .build();

        log.info("Engine statistics request: start={}, end={}, engine={}",
                filter.getStartDate(), filter.getEndDate(), filter.getEngine());

        return analyticsService.getEngineStatistics(filter)
                .map(ApiResponse::success)
                .doOnSuccess(response -> log.debug("Engine statistics generated successfully"))
                .doOnError(error -> log.error("Failed to generate engine statistics: {}", error.getMessage()));
    }

    /**
     * Get session summary only (lightweight endpoint).
     */
    @Operation(
            summary = "Get session summary",
            description = "Returns a lightweight session summary without detailed breakdowns"
    )
    @GetMapping("/sessions/summary")
    @PreAuthorize("@reactiveProjectSecurity.hasAnySystemRole('ADMIN', 'AUDITOR')")
    public Mono<ApiResponse<SessionSummary>> getSessionSummary(
            @Parameter(description = "Start date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @Parameter(description = "End date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate) {

        AnalyticsFilter filter = buildFilter(startDate, endDate, null, null);

        return analyticsService.getSessionSummary(filter)
                .map(ApiResponse::success);
    }

    /**
     * Get user engagement summary only (lightweight endpoint).
     */
    @Operation(
            summary = "Get user engagement summary",
            description = "Returns a lightweight user engagement summary without detailed breakdowns"
    )
    @GetMapping("/users/summary")
    @PreAuthorize("@reactiveProjectSecurity.hasAnySystemRole('ADMIN', 'AUDITOR')")
    public Mono<ApiResponse<UserEngagementSummary>> getUserEngagementSummary(
            @Parameter(description = "Start date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @Parameter(description = "End date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate) {

        AnalyticsFilter filter = buildFilter(startDate, endDate, null, null);

        return analyticsService.getUserEngagementSummary(filter)
                .map(ApiResponse::success);
    }

    /**
     * Get engine summary only (lightweight endpoint).
     */
    @Operation(
            summary = "Get engine usage summary",
            description = "Returns a lightweight engine usage summary without detailed breakdowns"
    )
    @GetMapping("/engines/summary")
    @PreAuthorize("@reactiveProjectSecurity.hasAnySystemRole('ADMIN', 'AUDITOR')")
    public Mono<ApiResponse<EngineSummary>> getEngineSummary(
            @Parameter(description = "Start date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @Parameter(description = "End date for analytics period (ISO format)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate) {

        AnalyticsFilter filter = buildFilter(startDate, endDate, null, null);

        return analyticsService.getEngineSummary(filter)
                .map(ApiResponse::success);
    }

    /**
     * Build analytics filter from request parameters.
     */
    private AnalyticsFilter buildFilter(LocalDateTime startDate, LocalDateTime endDate,
                                        Integer limit, String userId) {
        return AnalyticsFilter.builder()
                .startDate(startDate != null ? startDate : LocalDateTime.now().minusDays(30))
                .endDate(endDate != null ? endDate : LocalDateTime.now())
                .limit(limit != null ? limit : 100)
                .offset(0)
                .userId(userId)
                .build();
    }
}
