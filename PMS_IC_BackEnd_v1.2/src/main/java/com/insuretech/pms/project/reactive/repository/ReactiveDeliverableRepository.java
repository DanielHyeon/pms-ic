package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcDeliverable;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveDeliverableRepository extends ReactiveCrudRepository<R2dbcDeliverable, String> {

    Flux<R2dbcDeliverable> findByPhaseId(String phaseId);

    Flux<R2dbcDeliverable> findByPhaseIdAndStatus(String phaseId, String status);
}
