package com.insuretech.pms.decision.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.decision.dto.*;
import com.insuretech.pms.decision.reactive.entity.R2dbcDecisionRiskAuditTrail;
import com.insuretech.pms.decision.service.ReactiveDecisionRiskAuditService;
import com.insuretech.pms.decision.service.ReactiveRiskService;
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

@Tag(name = "Risks", description = "Risk management API")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/risks")
@RequiredArgsConstructor
public class ReactiveRiskController {

    private final ReactiveRiskService riskService;
    private final ReactiveDecisionRiskAuditService auditService;

    @Operation(summary = "List risks for a project")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<RiskSummaryDto>>>> listRisks(
            @PathVariable String projectId,
            @RequestParam(required = false) String status) {
        var flux = (status != null && !status.isBlank())
                ? riskService.listRisksByStatus(projectId, status)
                : riskService.listRisks(projectId);
        return flux.collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get risk detail with allowed transitions")
    @GetMapping("/{riskId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RiskDto>>> getRisk(
            @PathVariable String projectId,
            @PathVariable String riskId) {
        return riskService.getRisk(riskId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Get risk audit trail")
    @GetMapping("/{riskId}/audit")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<R2dbcDecisionRiskAuditTrail>>>> getRiskAudit(
            @PathVariable String projectId,
            @PathVariable String riskId) {
        return auditService.getAuditTrail("RISK", riskId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get risk assessment history")
    @GetMapping("/{riskId}/assessments")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<RiskAssessmentDto>>>> getAssessments(
            @PathVariable String projectId,
            @PathVariable String riskId) {
        return riskService.getAssessmentHistory(riskId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Create a risk")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RiskDto>>> createRisk(
            @PathVariable String projectId,
            @Valid @RequestBody RiskDto request,
            @AuthenticationPrincipal UserDetails user) {
        return riskService.createRisk(projectId, request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Risk created", dto)));
    }

    @Operation(summary = "Update a risk")
    @PutMapping("/{riskId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RiskDto>>> updateRisk(
            @PathVariable String projectId,
            @PathVariable String riskId,
            @RequestBody RiskDto request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            @AuthenticationPrincipal UserDetails user) {
        return riskService.updateRisk(riskId, request, user.getUsername(), ifMatch)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Risk updated", dto)));
    }

    @Operation(summary = "Transition risk status")
    @PatchMapping("/{riskId}/transition")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RiskDto>>> transitionRisk(
            @PathVariable String projectId,
            @PathVariable String riskId,
            @Valid @RequestBody TransitionRequest request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            @AuthenticationPrincipal UserDetails user) {
        return riskService.transitionRisk(riskId, request.getTargetStatus(),
                        user.getUsername(), ifMatch)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Risk transitioned", dto)));
    }

    @Operation(summary = "Record risk assessment")
    @PostMapping("/{riskId}/assess")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RiskAssessmentDto>>> assessRisk(
            @PathVariable String projectId,
            @PathVariable String riskId,
            @Valid @RequestBody RiskAssessmentDto request,
            @AuthenticationPrincipal UserDetails user) {
        return riskService.assessRisk(riskId, request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Risk assessed", dto)));
    }

    @Operation(summary = "Get 5x5 risk matrix data")
    @GetMapping("/matrix")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RiskMatrixDto>>> getRiskMatrix(
            @PathVariable String projectId) {
        return riskService.getRiskMatrix(projectId)
                .map(matrix -> ResponseEntity.ok(ApiResponse.success(matrix)));
    }

    @Operation(summary = "Delete a risk (only if IDENTIFIED)")
    @DeleteMapping("/{riskId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteRisk(
            @PathVariable String projectId,
            @PathVariable String riskId,
            @AuthenticationPrincipal UserDetails user) {
        return riskService.deleteRisk(riskId, user.getUsername())
                .then(Mono.just(ResponseEntity.ok(ApiResponse.<Void>success("Risk deleted", null))));
    }
}
