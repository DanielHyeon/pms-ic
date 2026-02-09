package com.insuretech.pms.test.reactive.repository;

import com.insuretech.pms.test.reactive.entity.R2dbcTestRun;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveTestRunRepository extends ReactiveCrudRepository<R2dbcTestRun, String> {

    Flux<R2dbcTestRun> findByTestCaseIdOrderByCreatedAtDesc(String testCaseId);

    Flux<R2dbcTestRun> findByProjectIdOrderByCreatedAtDesc(String projectId);

    @Query("SELECT COALESCE(MAX(run_number), 0) FROM task.test_runs WHERE test_case_id = :testCaseId")
    Mono<Integer> findMaxRunNumberByTestCaseId(String testCaseId);

    Mono<Long> countByProjectId(String projectId);
}
