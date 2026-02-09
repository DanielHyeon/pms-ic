package com.insuretech.pms.decision.reactive.repository;

import com.insuretech.pms.decision.reactive.entity.R2dbcEscalationLink;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveEscalationLinkRepository extends ReactiveCrudRepository<R2dbcEscalationLink, String> {

    Flux<R2dbcEscalationLink> findBySourceTypeAndSourceId(String sourceType, String sourceId);

    Flux<R2dbcEscalationLink> findByTargetTypeAndTargetId(String targetType, String targetId);

    Mono<Boolean> existsBySourceTypeAndSourceIdAndTargetTypeAndTargetId(
            String sourceType, String sourceId, String targetType, String targetId);

    @Query("""
        SELECT COUNT(*) FROM project.escalation_links el
        JOIN project.risks r ON el.source_type = 'RISK' AND el.source_id = r.id
        WHERE r.project_id = :projectId
        """)
    Mono<Long> countEscalationsByProject(String projectId);
}
