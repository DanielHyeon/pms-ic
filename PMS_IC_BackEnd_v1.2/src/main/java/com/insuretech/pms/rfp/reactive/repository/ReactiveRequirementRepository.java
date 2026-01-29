package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirement;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveRequirementRepository extends ReactiveCrudRepository<R2dbcRequirement, String> {

    Flux<R2dbcRequirement> findByProjectIdOrderByCodeAsc(String projectId);

    Flux<R2dbcRequirement> findByRfpId(String rfpId);

    Flux<R2dbcRequirement> findByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcRequirement> findByProjectIdAndCategory(String projectId, String category);

    Flux<R2dbcRequirement> findByProjectIdAndPriority(String projectId, String priority);

    Flux<R2dbcRequirement> findByAssigneeId(String assigneeId);

    Mono<R2dbcRequirement> findByCode(String code);

    Mono<Boolean> existsByCode(String code);

    @Query("UPDATE project.requirements SET status = :status WHERE id = :id")
    Mono<Void> updateStatus(String id, String status);

    @Query("UPDATE project.requirements SET progress_percentage = :progress, last_progress_update = NOW() WHERE id = :id")
    Mono<Void> updateProgress(String id, Integer progress);

    @Query("UPDATE project.requirements SET story_points = :storyPoints WHERE id = :id")
    Mono<Void> updateStoryPoints(String id, Integer storyPoints);

    Mono<Long> countByProjectId(String projectId);

    Mono<Long> countByProjectIdAndStatus(String projectId, String status);

    @Query("SELECT AVG(progress_percentage) FROM project.requirements WHERE project_id = :projectId")
    Mono<Double> getAverageProgressByProjectId(String projectId);

    @Query("SELECT SUM(story_points) FROM project.requirements WHERE project_id = :projectId")
    Mono<Integer> getTotalStoryPointsByProjectId(String projectId);
}
