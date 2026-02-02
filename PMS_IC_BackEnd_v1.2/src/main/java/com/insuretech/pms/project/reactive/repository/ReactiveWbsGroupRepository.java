package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsGroup;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsGroupRepository extends ReactiveCrudRepository<R2dbcWbsGroup, String> {

    Flux<R2dbcWbsGroup> findByPhaseIdOrderByOrderNumAsc(String phaseId);

    @Query("""
        SELECT wg.* FROM project.wbs_groups wg
        JOIN project.phases p ON wg.phase_id = p.id
        WHERE p.project_id = :projectId
        ORDER BY p.order_num ASC, wg.order_num ASC
        """)
    Flux<R2dbcWbsGroup> findByProjectIdOrdered(String projectId);

    Flux<R2dbcWbsGroup> findByLinkedEpicId(String epicId);

    Mono<R2dbcWbsGroup> findByPhaseIdAndCode(String phaseId, String code);

    @Query("SELECT COUNT(*) FROM project.wbs_groups WHERE phase_id = :phaseId")
    Mono<Long> countByPhaseId(String phaseId);

    Mono<Void> deleteByPhaseId(String phaseId);
}
