package com.insuretech.pms.task.reactive.repository;

import com.insuretech.pms.task.reactive.entity.R2dbcTask;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveTaskRepository extends ReactiveCrudRepository<R2dbcTask, String> {

    Flux<R2dbcTask> findByColumnIdOrderByOrderNumAsc(String columnId);

    Flux<R2dbcTask> findBySprintId(String sprintId);

    Flux<R2dbcTask> findByAssigneeId(String assigneeId);

    Flux<R2dbcTask> findByUserStoryId(String userStoryId);

    @Query("UPDATE task.tasks SET column_id = :columnId, order_num = :orderNum WHERE id = :id")
    Mono<Void> moveTask(String id, String columnId, Integer orderNum);

    @Query("UPDATE task.tasks SET status = :status WHERE id = :id")
    Mono<Void> updateStatus(String id, String status);

    Mono<Integer> countByColumnId(String columnId);

    // Direct project_id queries (tenant isolation)
    Flux<R2dbcTask> findByProjectIdOrderByOrderNumAsc(String projectId);

    Flux<R2dbcTask> findByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcTask> findByProjectIdAndAssigneeId(String projectId, String assigneeId);

    Flux<R2dbcTask> findByProjectIdAndSprintId(String projectId, String sprintId);

    Mono<Long> countByProjectId(String projectId);

    Mono<Long> countByProjectIdAndStatus(String projectId, String status);

    // Legacy join-based query (kept for backwards compatibility)
    @Query("SELECT t.* FROM task.tasks t JOIN task.kanban_columns kc ON t.column_id = kc.id WHERE kc.project_id = :projectId ORDER BY kc.order_num, t.order_num")
    Flux<R2dbcTask> findByProjectIdWithColumnOrder(String projectId);

    /**
     * Search tasks by keyword in title or description.
     * Used by AI assistant to find task assignments.
     */
    @Query("""
        SELECT t.* FROM task.tasks t
        WHERE t.project_id = :projectId
        AND (
            LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
        ORDER BY t.order_num ASC
        LIMIT 10
        """)
    Flux<R2dbcTask> searchByKeyword(String projectId, String keyword);
}
