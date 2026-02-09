package com.insuretech.pms.test.reactive.repository;

import com.insuretech.pms.test.reactive.entity.R2dbcTestCase;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveTestCaseRepository extends ReactiveCrudRepository<R2dbcTestCase, String> {

    Flux<R2dbcTestCase> findByProjectIdOrderByTestCaseCodeAsc(String projectId);

    Flux<R2dbcTestCase> findBySuiteIdOrderByTestCaseCodeAsc(String suiteId);

    Flux<R2dbcTestCase> findByProjectIdAndSuiteId(String projectId, String suiteId);

    Flux<R2dbcTestCase> findByProjectIdAndDefinitionStatus(String projectId, String definitionStatus);

    Mono<Long> countByProjectId(String projectId);

    @Query("SELECT COUNT(*) FROM task.test_cases WHERE project_id = :projectId AND last_outcome = :lastOutcome")
    Mono<Long> countByProjectIdAndLastOutcome(String projectId, String lastOutcome);

    @Query("SELECT COUNT(*) FROM task.test_cases WHERE project_id = :projectId AND definition_status = :definitionStatus")
    Mono<Long> countByProjectIdAndDefinitionStatus(String projectId, String definitionStatus);

    @Query("SELECT COUNT(*) FROM task.test_cases WHERE suite_id = :suiteId")
    Mono<Long> countBySuiteId(String suiteId);

    Mono<Boolean> existsByProjectIdAndTestCaseCode(String projectId, String testCaseCode);
}
