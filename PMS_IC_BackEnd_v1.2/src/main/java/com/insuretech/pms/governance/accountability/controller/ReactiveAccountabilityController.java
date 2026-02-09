package com.insuretech.pms.governance.accountability.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.governance.accountability.dto.*;
import com.insuretech.pms.governance.accountability.service.ReactiveAccountabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Tag(name = "Accountability", description = "Project Accountability Management (#20)")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/accountability")
@RequiredArgsConstructor
public class ReactiveAccountabilityController {

    private final ReactiveAccountabilityService accountabilityService;

    @Operation(summary = "Get project accountability (PM/Co-PM/Sponsor)")
    @GetMapping
    public Mono<ResponseEntity<ApiResponse<AccountabilityDto>>> getAccountability(
            @PathVariable String projectId) {
        return accountabilityService.getAccountability(projectId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Update project accountability (change PM/Co-PM/Sponsor)")
    @PutMapping
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<AccountabilityDto>>> updateAccountability(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateAccountabilityRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return accountabilityService.updateAccountability(projectId, request, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Accountability updated", dto)));
    }

    @Operation(summary = "Get accountability change history")
    @GetMapping("/changelog")
    public Mono<ResponseEntity<ApiResponse<List<ChangeLogEntryDto>>>> getChangeLog(
            @PathVariable String projectId) {
        return accountabilityService.getChangeLog(projectId)
                .collectList()
                .map(entries -> ResponseEntity.ok(ApiResponse.success(entries)));
    }

    @Operation(summary = "Get connection summary (parts, members, delegations)")
    @GetMapping("/connections")
    public Mono<ResponseEntity<ApiResponse<ConnectionSummaryDto>>> getConnectionSummary(
            @PathVariable String projectId) {
        return accountabilityService.getConnectionSummary(projectId)
                .map(summary -> ResponseEntity.ok(ApiResponse.success(summary)));
    }
}
