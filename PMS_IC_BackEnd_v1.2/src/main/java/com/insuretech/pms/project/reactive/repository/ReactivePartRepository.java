package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcPart;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactivePartRepository extends ReactiveCrudRepository<R2dbcPart, String> {

    Flux<R2dbcPart> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Mono<R2dbcPart> findByIdAndProjectId(String id, String projectId);

    @Query("SELECT * FROM project.parts WHERE project_id = :projectId AND status = :status ORDER BY created_at DESC")
    Flux<R2dbcPart> findByProjectIdAndStatus(String projectId, String status);

    Mono<Boolean> existsByIdAndProjectId(String id, String projectId);

    Flux<R2dbcPart> findByLeaderId(String leaderId);
}
