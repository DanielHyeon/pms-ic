package com.insuretech.pms.decision.reactive.repository;

import com.insuretech.pms.decision.reactive.entity.R2dbcDecisionRiskAuditTrail;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveDecisionRiskAuditRepository extends ReactiveCrudRepository<R2dbcDecisionRiskAuditTrail, String> {

    Flux<R2dbcDecisionRiskAuditTrail> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
            String entityType, String entityId);

    Flux<R2dbcDecisionRiskAuditTrail> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
