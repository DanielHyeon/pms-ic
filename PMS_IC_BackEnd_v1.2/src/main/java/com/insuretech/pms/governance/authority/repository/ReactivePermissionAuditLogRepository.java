package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcPermissionAuditLog;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactivePermissionAuditLogRepository extends ReactiveCrudRepository<R2dbcPermissionAuditLog, String> {

    Flux<R2dbcPermissionAuditLog> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
