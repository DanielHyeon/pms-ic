package com.insuretech.pms.governance.authority.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.governance.authority.dto.GovernanceCheckRunDto;
import com.insuretech.pms.governance.authority.dto.GovernanceFindingDto;
import com.insuretech.pms.governance.authority.service.ReactiveGovernanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Tag(name = "Governance", description = "Governance Check & Findings (#22)")
@RestController
@RequiredArgsConstructor
public class ReactiveGovernanceController {

    private final ReactiveGovernanceService governanceService;

    @Operation(summary = "Run governance check for a project")
    @PostMapping("/api/v2/projects/{projectId}/governance/check")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<GovernanceCheckRunDto>>> runGovernanceCheck(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return governanceService.runGovernanceCheck(projectId, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Governance check completed", dto)));
    }

    @Operation(summary = "List governance findings for a project")
    @GetMapping("/api/v2/projects/{projectId}/governance/findings")
    public Mono<ResponseEntity<ApiResponse<List<GovernanceFindingDto>>>> listFindings(
            @PathVariable String projectId) {
        return governanceService.listFindings(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "List governance check runs for a project")
    @GetMapping("/api/v2/projects/{projectId}/governance/check-runs")
    public Mono<ResponseEntity<ApiResponse<List<GovernanceCheckRunDto>>>> listCheckRuns(
            @PathVariable String projectId) {
        return governanceService.listCheckRuns(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }
}
