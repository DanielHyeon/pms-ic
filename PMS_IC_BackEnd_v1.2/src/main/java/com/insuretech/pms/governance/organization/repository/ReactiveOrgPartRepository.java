package com.insuretech.pms.governance.organization.repository;

import com.insuretech.pms.governance.organization.entity.R2dbcOrgPart;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveOrgPartRepository extends ReactiveCrudRepository<R2dbcOrgPart, String> {

    Flux<R2dbcOrgPart> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcOrgPart> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, String status);
}
