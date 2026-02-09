package com.insuretech.pms.ai.repository;

import com.insuretech.pms.ai.entity.R2dbcDecisionTrace;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface DecisionTraceRepository extends ReactiveCrudRepository<R2dbcDecisionTrace, String> {

    Flux<R2dbcDecisionTrace> findByProjectIdOrderByGeneratedAtDesc(String projectId);

    Flux<R2dbcDecisionTrace> findByProjectIdAndEventTypeOrderByGeneratedAtDesc(String projectId, String eventType);
}
