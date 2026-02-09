package com.insuretech.pms.decision.reactive.repository;

import com.insuretech.pms.decision.reactive.entity.R2dbcRisk;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveRiskRepository extends ReactiveCrudRepository<R2dbcRisk, String> {

    Flux<R2dbcRisk> findByProjectIdOrderByScoreDesc(String projectId);

    Flux<R2dbcRisk> findByProjectIdAndStatusOrderByScoreDesc(String projectId, String status);

    Mono<Long> countByProjectIdAndStatus(String projectId, String status);

    Mono<R2dbcRisk> findByProjectIdAndRiskCode(String projectId, String riskCode);

    @Query("SELECT COUNT(*) FROM project.risks WHERE project_id = :projectId")
    Mono<Long> countByProjectId(String projectId);

    @Query("""
        SELECT COUNT(*) FROM project.risks
        WHERE project_id = :projectId
          AND (impact * probability) >= 16
          AND status NOT IN ('RESOLVED', 'ACCEPTED')
        """)
    Mono<Long> countCriticalRisks(String projectId);

    @Query("""
        SELECT impact, probability, COUNT(*) as cnt
        FROM project.risks
        WHERE project_id = :projectId AND status NOT IN ('RESOLVED', 'ACCEPTED')
        GROUP BY impact, probability
        """)
    Flux<RiskMatrixCell> getRiskMatrix(String projectId);

    interface RiskMatrixCell {
        Integer getImpact();
        Integer getProbability();
        Long getCnt();
    }
}
