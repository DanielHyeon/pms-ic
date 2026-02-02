package com.insuretech.pms.task.reactive.repository;

import com.insuretech.pms.task.reactive.entity.R2dbcUserStory;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveUserStoryRepository extends ReactiveCrudRepository<R2dbcUserStory, String> {

    Flux<R2dbcUserStory> findByProjectIdOrderByPriorityOrderAsc(String projectId);

    @Query("SELECT * FROM task.user_stories WHERE project_id = :projectId AND status = :status ORDER BY priority_order ASC")
    Flux<R2dbcUserStory> findByProjectIdAndStatusOrderByPriorityOrderAsc(String projectId, String status);

    @Query("SELECT * FROM task.user_stories WHERE project_id = :projectId AND epic = :epic ORDER BY priority_order ASC")
    Flux<R2dbcUserStory> findByProjectIdAndEpicOrderByPriorityOrderAsc(String projectId, String epic);

    @Query("SELECT MAX(priority_order) FROM task.user_stories WHERE project_id = :projectId AND status = :status")
    Mono<Integer> findMaxPriorityOrderByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcUserStory> findByProjectId(String projectId);

    Flux<R2dbcUserStory> findByWbsItemId(String wbsItemId);

    Flux<R2dbcUserStory> findByFeatureId(String featureId);

    @Query("SELECT * FROM task.user_stories WHERE project_id = :projectId AND wbs_item_id IS NULL ORDER BY priority_order ASC")
    Flux<R2dbcUserStory> findByProjectIdAndWbsItemIdIsNull(String projectId);

    @Query("SELECT * FROM task.user_stories WHERE feature_id = :featureId AND wbs_item_id IS NULL ORDER BY priority_order ASC")
    Flux<R2dbcUserStory> findByFeatureIdAndWbsItemIdIsNull(String featureId);

    Flux<R2dbcUserStory> findByPartId(String partId);

    @Query("SELECT COUNT(*) FROM task.user_stories WHERE part_id = :partId")
    Mono<Long> countByPartId(String partId);

    @Query("SELECT COUNT(*) FROM task.user_stories WHERE part_id = :partId AND status = :status")
    Mono<Long> countByPartIdAndStatus(String partId, String status);

    @Query("SELECT COALESCE(SUM(story_points), 0) FROM task.user_stories WHERE part_id = :partId")
    Mono<Integer> sumStoryPointsByPartId(String partId);

    @Query("SELECT COALESCE(SUM(story_points), 0) FROM task.user_stories WHERE part_id = :partId AND status = :status")
    Mono<Integer> sumStoryPointsByPartIdAndStatus(String partId, String status);

    Flux<R2dbcUserStory> findBySprintId(String sprintId);

    Flux<R2dbcUserStory> findByAssigneeId(String assigneeId);
}
