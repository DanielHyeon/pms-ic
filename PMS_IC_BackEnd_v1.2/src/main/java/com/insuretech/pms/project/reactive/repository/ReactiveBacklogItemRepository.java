package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcBacklogItem;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveBacklogItemRepository extends ReactiveCrudRepository<R2dbcBacklogItem, String> {

    Flux<R2dbcBacklogItem> findByBacklogIdOrderByPriorityOrderAsc(String backlogId);

    @Query("SELECT * FROM project.backlog_items WHERE backlog_id = :backlogId AND status = :status ORDER BY priority_order ASC")
    Flux<R2dbcBacklogItem> findByBacklogIdAndStatus(String backlogId, String status);

    Flux<R2dbcBacklogItem> findByRequirementId(String requirementId);

    @Query("SELECT * FROM project.backlog_items WHERE backlog_id = :backlogId AND status = 'SELECTED' ORDER BY priority_order ASC")
    Flux<R2dbcBacklogItem> findSelectedItemsForSprintPlanning(String backlogId);

    @Query("SELECT MAX(priority_order) FROM project.backlog_items WHERE backlog_id = :backlogId")
    Mono<Integer> findMaxPriorityOrderByBacklogId(String backlogId);

    Mono<Long> countByBacklogId(String backlogId);

    @Query("SELECT COUNT(*) FROM project.backlog_items WHERE backlog_id = :backlogId AND status = :status")
    Mono<Long> countByBacklogIdAndStatus(String backlogId, String status);

    @Query("SELECT COALESCE(SUM(story_points), 0) FROM project.backlog_items WHERE backlog_id = :backlogId AND status = 'SELECTED'")
    Mono<Integer> sumStoryPointsForSelectedItems(String backlogId);

    Mono<Void> deleteByBacklogId(String backlogId);

    @Query("SELECT * FROM project.backlog_items WHERE sprint_id = :sprintId ORDER BY priority_order ASC")
    Flux<R2dbcBacklogItem> findBySprintId(String sprintId);

    @Query("SELECT COUNT(*) FROM project.backlog_items WHERE sprint_id = :sprintId")
    Mono<Long> countBySprintId(String sprintId);
}
