package com.insuretech.pms.governance.authority.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.governance.authority.dto.*;
import com.insuretech.pms.governance.authority.service.ReactiveDelegationService;
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

@Tag(name = "Delegations", description = "Capability Delegation Management (#22)")
@RestController
@RequiredArgsConstructor
public class ReactiveDelegationController {

    private final ReactiveDelegationService delegationService;

    @Operation(summary = "List all delegations for a project")
    @GetMapping("/api/v2/projects/{projectId}/delegations")
    public Mono<ResponseEntity<ApiResponse<List<DelegationDto>>>> listDelegations(
            @PathVariable String projectId) {
        return delegationService.listDelegations(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Create a new delegation")
    @PostMapping("/api/v2/projects/{projectId}/delegations")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<DelegationDto>>> createDelegation(
            @PathVariable String projectId,
            @Valid @RequestBody CreateDelegationRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return delegationService.createDelegation(projectId, request, actorUserId)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Delegation created", dto)));
    }

    @Operation(summary = "Approve a pending delegation")
    @PutMapping("/api/v2/delegations/{delegationId}/approve")
    public Mono<ResponseEntity<ApiResponse<DelegationDto>>> approveDelegation(
            @PathVariable String delegationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return delegationService.approveDelegation(delegationId, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Delegation approved", dto)));
    }

    @Operation(summary = "Revoke a delegation (cascades to child delegations)")
    @PutMapping("/api/v2/delegations/{delegationId}/revoke")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<DelegationDto>>> revokeDelegation(
            @PathVariable String delegationId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        String reason = body != null ? body.getOrDefault("reason", "") : "";
        return delegationService.revokeDelegation(delegationId, reason, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Delegation revoked", dto)));
    }

    @Operation(summary = "Get delegation map (tree structure) for a project")
    @GetMapping("/api/v2/projects/{projectId}/delegation-map")
    public Mono<ResponseEntity<ApiResponse<List<DelegationMapNodeDto>>>> getDelegationMap(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "false") boolean includeEffectiveCapabilities) {
        return delegationService.getDelegationMap(projectId, includeEffectiveCapabilities)
                .collectList()
                .map(nodes -> ResponseEntity.ok(ApiResponse.success(nodes)));
    }
}
