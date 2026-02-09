package com.insuretech.pms.ai.controller;

import com.insuretech.pms.ai.dto.AiBriefingResponseDto;
import com.insuretech.pms.ai.dto.BriefingRefreshRequest;
import com.insuretech.pms.ai.dto.DecisionTraceEventDto;
import com.insuretech.pms.ai.service.AiBriefingService;
import com.insuretech.pms.ai.service.AiDecisionTraceService;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * AI Briefing Controller providing decision-support briefings for project members.
 * 3 endpoints: GET briefing, POST refresh, POST trace-log.
 */
@Tag(name = "AI Briefing", description = "AI-driven project briefing and decision support")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/ai")
@RequiredArgsConstructor
@Slf4j
public class AiBriefingController {

    private final AiBriefingService briefingService;
    private final AiDecisionTraceService traceService;

    @Operation(summary = "Get AI briefing for project",
            description = "Returns cached or freshly generated briefing based on role and scope")
    @GetMapping("/briefing")
    @PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
    public Mono<ResponseEntity<ApiResponse<AiBriefingResponseDto>>> getBriefing(
            @PathVariable String projectId,
            @RequestParam String role,
            @RequestParam(required = false, defaultValue = "current_sprint") String scope) {
        log.info("GET /ai/briefing projectId={} role={} scope={}", projectId, role, scope);
        return briefingService.getBriefing(projectId, role, scope)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Force refresh AI briefing",
            description = "Invalidates cache and regenerates briefing from current data")
    @PostMapping("/briefing/refresh")
    @PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
    public Mono<ResponseEntity<ApiResponse<AiBriefingResponseDto>>> refreshBriefing(
            @PathVariable String projectId,
            @Valid @RequestBody BriefingRefreshRequest request) {
        log.info("POST /ai/briefing/refresh projectId={} role={} scope={}", projectId, request.role(), request.scope());
        String scope = request.scope() != null ? request.scope() : "current_sprint";
        return briefingService.refreshBriefing(projectId, request.role(), scope)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Log decision trace event",
            description = "Records user interaction events for audit and analytics")
    @PostMapping("/trace-log")
    @PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
    public Mono<ResponseEntity<ApiResponse<Map<String, Boolean>>>> logTrace(
            @PathVariable String projectId,
            @Valid @RequestBody DecisionTraceEventDto event) {
        log.debug("POST /ai/trace-log projectId={} eventType={}", projectId, event.eventType());
        return traceService.logEvent(projectId, event)
                .thenReturn(ResponseEntity.ok(ApiResponse.success(Map.of("ok", true))));
    }
}
