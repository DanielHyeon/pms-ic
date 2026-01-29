package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcIssue;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveIssueRepository extends ReactiveCrudRepository<R2dbcIssue, String> {

    Flux<R2dbcIssue> findByProjectIdOrderByCreatedAtDesc(String projectId);

    @Query("SELECT COUNT(*) FROM project.issues WHERE project_id = :projectId AND status IN (:statuses)")
    Mono<Long> countByProjectIdAndStatusIn(String projectId, String... statuses);

    @Query("SELECT COUNT(*) FROM project.issues WHERE project_id = :projectId AND status = :status")
    Mono<Long> countByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcIssue> findByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcIssue> findByAssignee(String assignee);
}
