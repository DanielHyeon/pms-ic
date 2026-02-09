package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcUserRole;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveUserRoleRepository extends ReactiveCrudRepository<R2dbcUserRole, String> {

    Flux<R2dbcUserRole> findByProjectIdAndUserId(String projectId, String userId);

    Flux<R2dbcUserRole> findByProjectId(String projectId);
}
