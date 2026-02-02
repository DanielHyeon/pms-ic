package com.insuretech.pms.auth.controller;

import com.insuretech.pms.auth.reactive.entity.R2dbcPermission;
import com.insuretech.pms.auth.reactive.entity.R2dbcRolePermission;
import com.insuretech.pms.auth.service.ReactivePermissionService;
import com.insuretech.pms.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v2/permissions")
@RequiredArgsConstructor
public class ReactivePermissionController {

    private final ReactivePermissionService permissionService;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<R2dbcPermission>>>> getAllPermissions() {
        return permissionService.getAllPermissions()
                .collectList()
                .map(permissions -> ResponseEntity.ok(ApiResponse.success(permissions)));
    }

    @GetMapping("/category/{category}")
    public Mono<ResponseEntity<ApiResponse<List<R2dbcPermission>>>> getPermissionsByCategory(
            @PathVariable String category) {
        return permissionService.getPermissionsByCategory(category)
                .collectList()
                .map(permissions -> ResponseEntity.ok(ApiResponse.success(permissions)));
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<R2dbcPermission>>> getPermissionById(@PathVariable String id) {
        return permissionService.getPermissionById(id)
                .map(permission -> ResponseEntity.ok(ApiResponse.success(permission)));
    }

    @GetMapping("/role/{role}")
    public Mono<ResponseEntity<ApiResponse<List<R2dbcPermission>>>> getPermissionsForRole(
            @PathVariable String role) {
        return permissionService.getPermissionsForRole(role)
                .collectList()
                .map(permissions -> ResponseEntity.ok(ApiResponse.success(permissions)));
    }

    @PostMapping("/role/{role}/grant/{permissionId}")
    public Mono<ResponseEntity<ApiResponse<R2dbcRolePermission>>> grantPermission(
            @PathVariable String role,
            @PathVariable String permissionId) {
        return permissionService.grantPermissionToRole(role, permissionId)
                .map(rp -> ResponseEntity.ok(ApiResponse.success("Permission granted", rp)));
    }

    @DeleteMapping("/role/{role}/revoke/{permissionId}")
    public Mono<ResponseEntity<ApiResponse<Void>>> revokePermission(
            @PathVariable String role,
            @PathVariable String permissionId) {
        return permissionService.revokePermissionFromRole(role, permissionId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Permission revoked", null))));
    }

    @GetMapping("/role/{role}/all")
    public Mono<ResponseEntity<ApiResponse<List<R2dbcRolePermission>>>> getRolePermissions(
            @PathVariable String role) {
        return permissionService.getRolePermissions(role)
                .collectList()
                .map(rps -> ResponseEntity.ok(ApiResponse.success(rps)));
    }
}
