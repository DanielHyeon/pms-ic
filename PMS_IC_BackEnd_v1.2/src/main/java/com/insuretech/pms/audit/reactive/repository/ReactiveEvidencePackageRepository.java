package com.insuretech.pms.audit.reactive.repository;

import com.insuretech.pms.audit.reactive.entity.R2dbcEvidencePackage;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveEvidencePackageRepository extends ReactiveCrudRepository<R2dbcEvidencePackage, String> {

    Flux<R2dbcEvidencePackage> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcEvidencePackage> findByRequestedByOrderByCreatedAtDesc(String requestedBy);
}
