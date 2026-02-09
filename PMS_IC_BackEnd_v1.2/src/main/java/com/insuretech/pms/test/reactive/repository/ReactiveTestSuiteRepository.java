package com.insuretech.pms.test.reactive.repository;

import com.insuretech.pms.test.reactive.entity.R2dbcTestSuite;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveTestSuiteRepository extends ReactiveCrudRepository<R2dbcTestSuite, String> {

    Flux<R2dbcTestSuite> findByProjectIdOrderByOrderNumAsc(String projectId);

    Flux<R2dbcTestSuite> findByProjectIdAndStatusOrderByOrderNumAsc(String projectId, String status);

    Mono<Long> countByProjectId(String projectId);
}
