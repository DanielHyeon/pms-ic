package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcCapability;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveCapabilityRepository extends ReactiveCrudRepository<R2dbcCapability, String> {

    Flux<R2dbcCapability> findByCategory(String category);
}
