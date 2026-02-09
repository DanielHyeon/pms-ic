package com.insuretech.pms.test.reactive.repository;

import com.insuretech.pms.test.reactive.entity.R2dbcTestStep;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveTestStepRepository extends ReactiveCrudRepository<R2dbcTestStep, String> {

    Flux<R2dbcTestStep> findByTestCaseIdOrderByStepNumberAsc(String testCaseId);

    Mono<Void> deleteByTestCaseId(String testCaseId);
}
