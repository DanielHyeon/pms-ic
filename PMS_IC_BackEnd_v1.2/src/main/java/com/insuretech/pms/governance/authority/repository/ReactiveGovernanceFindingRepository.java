package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcGovernanceFinding;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveGovernanceFindingRepository extends ReactiveCrudRepository<R2dbcGovernanceFinding, String> {

    Flux<R2dbcGovernanceFinding> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcGovernanceFinding> findByRunId(String runId);
}
