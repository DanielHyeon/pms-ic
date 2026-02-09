package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirementCandidate;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveRequirementCandidateRepository extends ReactiveCrudRepository<R2dbcRequirementCandidate, String> {

    Flux<R2dbcRequirementCandidate> findByExtractionRunIdOrderByReqKeyAsc(String extractionRunId);

    Flux<R2dbcRequirementCandidate> findByRfpIdAndStatus(String rfpId, String status);

    Mono<Long> countByExtractionRunId(String extractionRunId);

    Mono<Long> countByExtractionRunIdAndStatus(String extractionRunId, String status);
}
