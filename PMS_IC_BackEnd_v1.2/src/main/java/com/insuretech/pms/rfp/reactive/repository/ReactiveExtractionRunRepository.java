package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcExtractionRun;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveExtractionRunRepository extends ReactiveCrudRepository<R2dbcExtractionRun, String> {

    Flux<R2dbcExtractionRun> findByRfpIdOrderByCreatedAtDesc(String rfpId);

    Mono<R2dbcExtractionRun> findByRfpIdAndIsActive(String rfpId, Boolean isActive);

    @Query("UPDATE rfp.rfp_extraction_runs SET is_active = false WHERE rfp_id = :rfpId")
    Mono<Void> deactivateAllByRfpId(String rfpId);
}
