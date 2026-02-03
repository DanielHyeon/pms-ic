package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsTask;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsTaskRepository extends ReactiveCrudRepository<R2dbcWbsTask, String> {

    Flux<R2dbcWbsTask> findByItemIdOrderByOrderNumAsc(String itemId);

    Flux<R2dbcWbsTask> findByGroupIdOrderByOrderNumAsc(String groupId);

    Flux<R2dbcWbsTask> findByPhaseIdOrderByOrderNumAsc(String phaseId);

    Mono<R2dbcWbsTask> findByItemIdAndCode(String itemId, String code);

    Flux<R2dbcWbsTask> findByLinkedTaskId(String linkedTaskId);

    @Query("SELECT COUNT(*) FROM project.wbs_tasks WHERE item_id = :itemId")
    Mono<Long> countByItemId(String itemId);

    Flux<R2dbcWbsTask> findByAssigneeId(String assigneeId);

    @Query("""
        SELECT wt.* FROM project.wbs_tasks wt
        JOIN project.wbs_items wi ON wt.item_id = wi.id
        JOIN project.wbs_groups wg ON wt.group_id = wg.id
        JOIN project.phases p ON wt.phase_id = p.id
        WHERE p.project_id = :projectId
        ORDER BY p.order_num ASC, wg.order_num ASC, wi.order_num ASC, wt.order_num ASC
        """)
    Flux<R2dbcWbsTask> findByProjectIdOrdered(String projectId);

    Mono<Void> deleteByPhaseId(String phaseId);

    Mono<Void> deleteByItemId(String itemId);

    @Query("""
        SELECT wt.* FROM project.wbs_tasks wt
        JOIN project.phases p ON wt.phase_id = p.id
        WHERE p.project_id = :projectId
        AND (
            LOWER(wt.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(wt.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
        ORDER BY p.order_num ASC, wt.order_num ASC
        LIMIT 10
        """)
    Flux<R2dbcWbsTask> searchByKeyword(String projectId, String keyword);
}
