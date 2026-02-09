package com.insuretech.pms.decision.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.decision.dto.*;
import com.insuretech.pms.decision.reactive.entity.R2dbcDecisionRiskAuditTrail;
import com.insuretech.pms.decision.service.ReactiveDecisionRiskAuditService;
import com.insuretech.pms.decision.service.ReactiveDecisionRiskKpiService;
import com.insuretech.pms.decision.service.ReactiveDecisionService;
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
import java.util.Map;

@Tag(name = "Decisions", description = "Decision management API")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/decisions")
@RequiredArgsConstructor
public class ReactiveDecisionController {

    private final ReactiveDecisionService decisionService;
    private final ReactiveDecisionRiskAuditService auditService;
    private final ReactiveDecisionRiskKpiService kpiService;

    @Operation(summary = "List decisions for a project")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<DecisionSummaryDto>>>> listDecisions(
            @PathVariable String projectId,
            @RequestParam(required = false) String status) {
        var flux = (status != null && !status.isBlank())
                ? decisionService.listDecisionsByStatus(projectId, status)
                : decisionService.listDecisions(projectId);
        return flux.collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get decision detail with allowed transitions")
    @GetMapping("/{decisionId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionDto>>> getDecision(
            @PathVariable String projectId,
            @PathVariable String decisionId) {
        return decisionService.getDecision(decisionId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Get decision audit trail")
    @GetMapping("/{decisionId}/audit")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<R2dbcDecisionRiskAuditTrail>>>> getDecisionAudit(
            @PathVariable String projectId,
            @PathVariable String decisionId) {
        return auditService.getAuditTrail("DECISION", decisionId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Create a decision")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionDto>>> createDecision(
            @PathVariable String projectId,
            @Valid @RequestBody DecisionDto request,
            @AuthenticationPrincipal UserDetails user) {
        return decisionService.createDecision(projectId, request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Decision created", dto)));
    }

    @Operation(summary = "Update a decision")
    @PutMapping("/{decisionId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionDto>>> updateDecision(
            @PathVariable String projectId,
            @PathVariable String decisionId,
            @RequestBody DecisionDto request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            @AuthenticationPrincipal UserDetails user) {
        return decisionService.updateDecision(decisionId, request, user.getUsername(), ifMatch)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Decision updated", dto)));
    }

    @Operation(summary = "Transition decision status")
    @PatchMapping("/{decisionId}/transition")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionDto>>> transitionDecision(
            @PathVariable String projectId,
            @PathVariable String decisionId,
            @Valid @RequestBody TransitionRequest request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            @AuthenticationPrincipal UserDetails user) {
        return decisionService.transitionDecision(decisionId, request.getTargetStatus(),
                        user.getUsername(), ifMatch)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Decision transitioned", dto)));
    }

    @Operation(summary = "Approve a decision")
    @PostMapping("/{decisionId}/approve")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionDto>>> approveDecision(
            @PathVariable String projectId,
            @PathVariable String decisionId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            @AuthenticationPrincipal UserDetails user) {
        return decisionService.approveDecision(decisionId,
                        request.get("selectedOption"), request.get("rationale"),
                        user.getUsername(), ifMatch)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Decision approved", dto)));
    }

    @Operation(summary = "Reject a decision")
    @PostMapping("/{decisionId}/reject")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionDto>>> rejectDecision(
            @PathVariable String projectId,
            @PathVariable String decisionId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            @AuthenticationPrincipal UserDetails user) {
        return decisionService.rejectDecision(decisionId,
                        request.get("rationale"), user.getUsername(), ifMatch)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Decision rejected", dto)));
    }

    @Operation(summary = "Defer a decision")
    @PostMapping("/{decisionId}/defer")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionDto>>> deferDecision(
            @PathVariable String projectId,
            @PathVariable String decisionId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            @AuthenticationPrincipal UserDetails user) {
        return decisionService.deferDecision(decisionId,
                        request.get("rationale"), user.getUsername(), ifMatch)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Decision deferred", dto)));
    }

    @Operation(summary = "Delete a decision (only if PROPOSED)")
    @DeleteMapping("/{decisionId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteDecision(
            @PathVariable String projectId,
            @PathVariable String decisionId,
            @AuthenticationPrincipal UserDetails user) {
        return decisionService.deleteDecision(decisionId, user.getUsername())
                .then(Mono.just(ResponseEntity.ok(ApiResponse.<Void>success("Decision deleted", null))));
    }

    @Operation(summary = "Get KPI summary for decisions and risks")
    @GetMapping("/kpi")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DecisionRiskKpiDto>>> getKpi(
            @PathVariable String projectId) {
        return kpiService.getKpi(projectId)
                .map(kpi -> ResponseEntity.ok(ApiResponse.success(kpi)));
    }
}
