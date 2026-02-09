package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcRfpChangeEvent;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveRfpChangeEventRepository extends ReactiveCrudRepository<R2dbcRfpChangeEvent, String> {

    Flux<R2dbcRfpChangeEvent> findByRfpIdOrderByChangedAtDesc(String rfpId);
}
