package com.insuretech.pms.auth.service;

import com.insuretech.pms.auth.reactive.entity.R2dbcPermission;
import com.insuretech.pms.auth.reactive.entity.R2dbcRolePermission;
import com.insuretech.pms.auth.reactive.repository.ReactivePermissionRepository;
import com.insuretech.pms.auth.reactive.repository.ReactiveRolePermissionRepository;
import com.insuretech.pms.common.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactivePermissionService {

    private final ReactivePermissionRepository permissionRepository;
    private final ReactiveRolePermissionRepository rolePermissionRepository;
    private final TransactionalOperator transactionalOperator;

    public Flux<R2dbcPermission> getAllPermissions() {
        return permissionRepository.findAllByOrderByCategoryAscNameAsc();
    }

    public Flux<R2dbcPermission> getPermissionsByCategory(String category) {
        return permissionRepository.findByCategory(category);
    }

    public Mono<R2dbcPermission> getPermissionById(String id) {
        return permissionRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Permission not found: " + id)));
    }

    public Flux<R2dbcPermission> getPermissionsForRole(String role) {
        return rolePermissionRepository.findByRoleAndGrantedTrue(role)
                .flatMap(rp -> permissionRepository.findById(rp.getPermissionId()));
    }

    public Mono<R2dbcRolePermission> grantPermissionToRole(String role, String permissionId) {
        return permissionRepository.findById(permissionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Permission not found: " + permissionId)))
                .flatMap(permission -> rolePermissionRepository.existsByRoleAndPermissionId(role, permissionId)
                        .flatMap(exists -> {
                            if (exists) {
                                return Mono.error(CustomException.conflict("Permission already granted to role"));
                            }
                            R2dbcRolePermission rp = R2dbcRolePermission.builder()
                                    .id(UUID.randomUUID().toString())
                                    .role(role)
                                    .permissionId(permissionId)
                                    .granted(true)
                                    .build();
                            return rolePermissionRepository.save(rp);
                        }))
                .as(transactionalOperator::transactional)
                .doOnSuccess(rp -> log.info("Granted permission {} to role {}", permissionId, role));
    }

    public Mono<Void> revokePermissionFromRole(String role, String permissionId) {
        return rolePermissionRepository.deleteByRoleAndPermissionId(role, permissionId)
                .doOnSuccess(v -> log.info("Revoked permission {} from role {}", permissionId, role));
    }

    public Flux<R2dbcRolePermission> getRolePermissions(String role) {
        return rolePermissionRepository.findByRole(role);
    }
}
