package com.insuretech.pms.decision.reactive.repository;

import com.insuretech.pms.decision.reactive.entity.R2dbcDecision;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveDecisionRepository extends ReactiveCrudRepository<R2dbcDecision, String> {

    Flux<R2dbcDecision> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcDecision> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, String status);

    Mono<Long> countByProjectIdAndStatus(String projectId, String status);

    Mono<R2dbcDecision> findByProjectIdAndDecisionCode(String projectId, String decisionCode);

    @Query("SELECT COUNT(*) FROM project.decisions WHERE project_id = :projectId")
    Mono<Long> countByProjectId(String projectId);

    @Query("""
        SELECT AVG(EXTRACT(EPOCH FROM (decided_at - created_at)) / 3600)
        FROM project.decisions
        WHERE project_id = :projectId AND decided_at IS NOT NULL
        """)
    Mono<Double> avgDecisionTimeHours(String projectId);
}
