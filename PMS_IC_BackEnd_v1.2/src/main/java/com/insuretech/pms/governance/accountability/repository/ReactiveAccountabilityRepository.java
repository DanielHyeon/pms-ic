package com.insuretech.pms.governance.accountability.repository;

import com.insuretech.pms.governance.accountability.entity.R2dbcProjectAccountability;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveAccountabilityRepository
        extends ReactiveCrudRepository<R2dbcProjectAccountability, String> {

    Mono<R2dbcProjectAccountability> findByProjectId(String projectId);
}
