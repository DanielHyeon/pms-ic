package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcBacklog;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveBacklogRepository extends ReactiveCrudRepository<R2dbcBacklog, String> {

    Flux<R2dbcBacklog> findByProjectId(String projectId);

    @Query("SELECT * FROM project.backlogs WHERE project_id = :projectId AND status = 'ACTIVE' LIMIT 1")
    Mono<R2dbcBacklog> findActiveBacklogByProjectId(String projectId);

    Mono<Boolean> existsByProjectId(String projectId);

    Mono<R2dbcBacklog> findByProjectIdAndName(String projectId, String name);
}
