package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcGovernanceCheckRun;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveGovernanceCheckRunRepository extends ReactiveCrudRepository<R2dbcGovernanceCheckRun, String> {

    Flux<R2dbcGovernanceCheckRun> findByProjectIdOrderByCheckedAtDesc(String projectId);
}
