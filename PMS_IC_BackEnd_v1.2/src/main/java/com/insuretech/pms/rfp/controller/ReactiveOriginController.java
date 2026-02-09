package com.insuretech.pms.rfp.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.rfp.dto.OriginPolicyDto;
import com.insuretech.pms.rfp.dto.OriginSummaryDto;
import com.insuretech.pms.rfp.dto.SetOriginRequest;
import com.insuretech.pms.rfp.service.ReactiveOriginService;
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

@Tag(name = "RFP Origin", description = "Project origin type and governance policy management")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/origin")
@RequiredArgsConstructor
public class ReactiveOriginController {

    private final ReactiveOriginService originService;

    @Operation(summary = "Set project origin type (first time only)")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<OriginPolicyDto>>> setOrigin(
            @PathVariable String projectId,
            @Valid @RequestBody SetOriginRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return originService.setOrigin(projectId, request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Origin set", dto)));
    }

    @Operation(summary = "Get project origin policy")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<OriginPolicyDto>>> getOrigin(
            @PathVariable String projectId) {
        return originService.getOrigin(projectId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Update project origin type (requires PM+ approval)")
    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<OriginPolicyDto>>> updateOrigin(
            @PathVariable String projectId,
            @Valid @RequestBody SetOriginRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return originService.updateOrigin(projectId, request, user.getUsername())
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Origin updated", dto)));
    }

    @Operation(summary = "Get origin summary with KPIs for OriginSummaryStrip")
    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<OriginSummaryDto>>> getOriginSummary(
            @PathVariable String projectId) {
        return originService.getOriginSummary(projectId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }
}
