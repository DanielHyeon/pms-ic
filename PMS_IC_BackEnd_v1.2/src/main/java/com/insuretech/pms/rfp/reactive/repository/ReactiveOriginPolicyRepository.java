package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcOriginPolicy;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveOriginPolicyRepository extends ReactiveCrudRepository<R2dbcOriginPolicy, String> {

    Mono<R2dbcOriginPolicy> findByProjectId(String projectId);

    Mono<Boolean> existsByProjectId(String projectId);
}
