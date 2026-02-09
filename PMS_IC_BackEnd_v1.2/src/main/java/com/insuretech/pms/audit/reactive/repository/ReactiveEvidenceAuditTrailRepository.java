package com.insuretech.pms.audit.reactive.repository;

import com.insuretech.pms.audit.reactive.entity.R2dbcEvidenceAuditTrail;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveEvidenceAuditTrailRepository extends ReactiveCrudRepository<R2dbcEvidenceAuditTrail, String> {

    Flux<R2dbcEvidenceAuditTrail> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
