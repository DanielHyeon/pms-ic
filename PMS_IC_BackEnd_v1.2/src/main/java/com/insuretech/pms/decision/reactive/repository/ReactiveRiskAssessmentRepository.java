package com.insuretech.pms.decision.reactive.repository;

import com.insuretech.pms.decision.reactive.entity.R2dbcRiskAssessment;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveRiskAssessmentRepository extends ReactiveCrudRepository<R2dbcRiskAssessment, String> {

    Flux<R2dbcRiskAssessment> findByRiskIdOrderByCreatedAtDesc(String riskId);

    Mono<R2dbcRiskAssessment> findFirstByRiskIdOrderByCreatedAtDesc(String riskId);
}
