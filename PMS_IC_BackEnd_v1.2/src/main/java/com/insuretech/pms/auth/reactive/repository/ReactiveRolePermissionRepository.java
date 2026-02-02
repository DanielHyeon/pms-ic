package com.insuretech.pms.auth.reactive.repository;

import com.insuretech.pms.auth.reactive.entity.R2dbcRolePermission;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveRolePermissionRepository extends ReactiveCrudRepository<R2dbcRolePermission, String> {

    Flux<R2dbcRolePermission> findByRole(String role);

    Flux<R2dbcRolePermission> findByRoleAndGrantedTrue(String role);

    Mono<Boolean> existsByRoleAndPermissionId(String role, String permissionId);

    @Query("DELETE FROM auth.role_permissions WHERE role = :role AND permission_id = :permissionId")
    Mono<Void> deleteByRoleAndPermissionId(String role, String permissionId);
}
