package com.insuretech.pms.test.reactive.repository;

import com.insuretech.pms.test.reactive.entity.R2dbcTestRunStepResult;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveTestRunStepResultRepository extends ReactiveCrudRepository<R2dbcTestRunStepResult, String> {

    Flux<R2dbcTestRunStepResult> findByTestRunIdOrderByStepNumberAsc(String testRunId);
}
