package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcUserCapability;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveUserCapabilityRepository extends ReactiveCrudRepository<R2dbcUserCapability, String> {

    Flux<R2dbcUserCapability> findByProjectIdAndUserId(String projectId, String userId);

    Flux<R2dbcUserCapability> findByProjectId(String projectId);
}
