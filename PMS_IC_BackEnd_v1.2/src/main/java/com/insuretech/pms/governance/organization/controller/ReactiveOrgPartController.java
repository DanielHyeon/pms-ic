package com.insuretech.pms.governance.organization.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.governance.organization.dto.*;
import com.insuretech.pms.governance.organization.service.ReactiveMembershipService;
import com.insuretech.pms.governance.organization.service.ReactiveOrgPartService;
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

@Tag(name = "Organization", description = "Part & Membership Management (#21)")
@RestController
@RequiredArgsConstructor
public class ReactiveOrgPartController {

    private final ReactiveOrgPartService partService;
    private final ReactiveMembershipService membershipService;

    // --- Part CRUD ---

    @Operation(summary = "List all parts for a project")
    @GetMapping("/api/v2/projects/{projectId}/org/parts")
    public Mono<ResponseEntity<ApiResponse<List<OrgPartDto>>>> listParts(
            @PathVariable String projectId,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        return (activeOnly ? partService.listActiveParts(projectId) : partService.listParts(projectId))
                .collectList()
                .map(parts -> ResponseEntity.ok(ApiResponse.success(parts)));
    }

    @Operation(summary = "Create a new part")
    @PostMapping("/api/v2/projects/{projectId}/org/parts")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<OrgPartDto>>> createPart(
            @PathVariable String projectId,
            @Valid @RequestBody CreateOrgPartRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return partService.createPart(projectId, request, actorUserId)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Part created", dto)));
    }

    @Operation(summary = "Get part detail with members")
    @GetMapping("/api/v2/org/parts/{partId}")
    public Mono<ResponseEntity<ApiResponse<OrgPartDetailDto>>> getPartDetail(
            @PathVariable String partId) {
        return partService.getPartDetail(partId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Update part name/type")
    @PutMapping("/api/v2/org/parts/{partId}")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<OrgPartDto>>> updatePart(
            @PathVariable String partId,
            @Valid @RequestBody UpdateOrgPartRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return partService.updatePart(partId, request, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Part updated", dto)));
    }

    @Operation(summary = "Close a part")
    @PutMapping("/api/v2/org/parts/{partId}/close")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<OrgPartDto>>> closePart(
            @PathVariable String partId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return partService.closePart(partId, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Part closed", dto)));
    }

    @Operation(summary = "Reopen a closed part")
    @PutMapping("/api/v2/org/parts/{partId}/reopen")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<OrgPartDto>>> reopenPart(
            @PathVariable String partId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return partService.reopenPart(partId, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Part reopened", dto)));
    }

    // --- Leader ---

    @Operation(summary = "Change part leader")
    @PutMapping("/api/v2/org/parts/{partId}/leader")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<OrgPartDto>>> changeLeader(
            @PathVariable String partId,
            @Valid @RequestBody ChangeLeaderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return partService.changeLeader(partId, request, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Leader changed", dto)));
    }

    @Operation(summary = "Get leader warning (missing capabilities)")
    @GetMapping("/api/v2/org/parts/{partId}/leader-warning")
    public Mono<ResponseEntity<ApiResponse<LeaderWarningDto>>> getLeaderWarning(
            @PathVariable String partId) {
        return partService.getLeaderWarning(partId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    // --- Membership ---

    @Operation(summary = "Add member to part")
    @PostMapping("/api/v2/org/parts/{partId}/members")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<MemberDto>>> addMember(
            @PathVariable String partId,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return membershipService.addMember(partId, request, actorUserId)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Member added", dto)));
    }

    @Operation(summary = "Remove member from part")
    @DeleteMapping("/api/v2/org/parts/{partId}/members/{userId}")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Void>>> removeMember(
            @PathVariable String partId,
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return membershipService.removeMember(partId, userId, actorUserId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.<Void>success("Member removed", null))));
    }

    @Operation(summary = "Switch membership type (PRIMARY <-> SECONDARY)")
    @PutMapping("/api/v2/org/parts/{partId}/members/{userId}/switch-type")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<MemberDto>>> switchMembershipType(
            @PathVariable String partId,
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return membershipService.switchMembershipType(partId, userId, actorUserId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Membership type switched", dto)));
    }

    // --- User Summary ---

    @Operation(summary = "Get user's part membership summary")
    @GetMapping("/api/v2/projects/{projectId}/org/user-summary/{userId}")
    public Mono<ResponseEntity<ApiResponse<UserPartSummaryDto>>> getUserPartSummary(
            @PathVariable String projectId,
            @PathVariable String userId) {
        return membershipService.getUserPartSummary(projectId, userId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }
}
