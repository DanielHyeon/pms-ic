package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcRole;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveRoleRepository extends ReactiveCrudRepository<R2dbcRole, String> {

    Flux<R2dbcRole> findByProjectIdIsNullOrProjectId(String projectId);
}
