package com.insuretech.pms.governance.authority.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.governance.authority.dto.*;
import com.insuretech.pms.governance.authority.service.ReactiveEffectiveCapService;
import com.insuretech.pms.governance.authority.service.ReactiveRoleService;
import com.insuretech.pms.governance.authority.service.ReactiveUserAuthorityService;
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

@Tag(name = "Roles & Capabilities", description = "Role and Capability Management (#22)")
@RestController
@RequiredArgsConstructor
public class ReactiveRoleController {

    private final ReactiveRoleService roleService;
    private final ReactiveEffectiveCapService effectiveCapService;
    private final ReactiveUserAuthorityService userAuthorityService;

    @Operation(summary = "List all roles for a project (includes global roles)")
    @GetMapping("/api/v2/projects/{projectId}/roles")
    public Mono<ResponseEntity<ApiResponse<List<RoleDto>>>> listRoles(
            @PathVariable String projectId) {
        return roleService.listRoles(projectId)
                .collectList()
                .map(roles -> ResponseEntity.ok(ApiResponse.success(roles)));
    }

    @Operation(summary = "List all capabilities")
    @GetMapping("/api/v2/projects/{projectId}/capabilities")
    public Mono<ResponseEntity<ApiResponse<List<CapabilityDto>>>> listCapabilities(
            @PathVariable String projectId,
            @RequestParam(required = false) String category) {
        return (category != null
                ? roleService.listCapabilitiesByCategory(category)
                : roleService.listCapabilities())
                .collectList()
                .map(caps -> ResponseEntity.ok(ApiResponse.success(caps)));
    }

    @Operation(summary = "List user-role assignments for a project")
    @GetMapping("/api/v2/projects/{projectId}/user-roles")
    public Mono<ResponseEntity<ApiResponse<List<UserRoleDto>>>> listUserRoles(
            @PathVariable String projectId) {
        return roleService.listUserRoles(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Grant a role to a user")
    @PostMapping("/api/v2/projects/{projectId}/user-roles")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<UserRoleDto>>> grantUserRole(
            @PathVariable String projectId,
            @Valid @RequestBody GrantUserRoleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return roleService.grantUserRole(projectId, request, actorUserId)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Role granted", dto)));
    }

    @Operation(summary = "Revoke a user-role assignment")
    @DeleteMapping("/api/v2/projects/{projectId}/user-roles/{userRoleId}")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Void>>> revokeUserRole(
            @PathVariable String projectId,
            @PathVariable String userRoleId) {
        return roleService.revokeUserRole(userRoleId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.<Void>success("Role revoked", null))));
    }

    @Operation(summary = "List user-capability direct grants for a project")
    @GetMapping("/api/v2/projects/{projectId}/user-capabilities")
    public Mono<ResponseEntity<ApiResponse<List<UserCapabilityDto>>>> listUserCapabilities(
            @PathVariable String projectId) {
        return roleService.listUserCapabilities(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Grant a capability directly to a user")
    @PostMapping("/api/v2/projects/{projectId}/user-capabilities")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<UserCapabilityDto>>> grantUserCapability(
            @PathVariable String projectId,
            @Valid @RequestBody GrantUserCapabilityRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String actorUserId = userDetails != null ? userDetails.getUsername() : "unknown";
        return roleService.grantUserCapability(projectId, request, actorUserId)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Capability granted", dto)));
    }

    @Operation(summary = "Revoke a direct user-capability grant")
    @DeleteMapping("/api/v2/projects/{projectId}/user-capabilities/{userCapId}")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM', 'ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Void>>> revokeUserCapability(
            @PathVariable String projectId,
            @PathVariable String userCapId) {
        return roleService.revokeUserCapability(userCapId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.<Void>success("Capability revoked", null))));
    }

    @Operation(summary = "Get effective capabilities for a user (combined from roles, direct grants, and delegations)")
    @GetMapping("/api/v2/projects/{projectId}/users/{userId}/effective-capabilities")
    public Mono<ResponseEntity<ApiResponse<List<EffectiveCapabilityDto>>>> getEffectiveCapabilities(
            @PathVariable String projectId,
            @PathVariable String userId) {
        return effectiveCapService.getEffectiveCapabilities(projectId, userId)
                .collectList()
                .map(caps -> ResponseEntity.ok(ApiResponse.success(caps)));
    }

    @Operation(summary = "사용자 권한 상세 조회 (User 360) — 소속, 역할, 직접권한, 위임권한, 유효권한 통합")
    @GetMapping("/api/v2/projects/{projectId}/users/{userId}/authority")
    public Mono<ResponseEntity<ApiResponse<UserAuthorityDto>>> getUserAuthority(
            @PathVariable String projectId,
            @PathVariable String userId) {
        return userAuthorityService.getUserAuthority(projectId, userId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }
}
