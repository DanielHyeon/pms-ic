package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsItem;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsItemRepository extends ReactiveCrudRepository<R2dbcWbsItem, String> {

    Flux<R2dbcWbsItem> findByGroupIdOrderByOrderNumAsc(String groupId);

    Flux<R2dbcWbsItem> findByPhaseIdOrderByOrderNumAsc(String phaseId);

    @Query("""
        SELECT wi.* FROM project.wbs_items wi
        JOIN project.wbs_groups wg ON wi.group_id = wg.id
        JOIN project.phases p ON wi.phase_id = p.id
        WHERE p.project_id = :projectId
        ORDER BY p.order_num ASC, wg.order_num ASC, wi.order_num ASC
        """)
    Flux<R2dbcWbsItem> findByProjectIdOrdered(String projectId);

    Mono<R2dbcWbsItem> findByGroupIdAndCode(String groupId, String code);

    @Query("SELECT COUNT(*) FROM project.wbs_items WHERE group_id = :groupId")
    Mono<Long> countByGroupId(String groupId);

    Flux<R2dbcWbsItem> findByAssigneeId(String assigneeId);

    Mono<Void> deleteByPhaseId(String phaseId);

    Mono<Void> deleteByGroupId(String groupId);
}
