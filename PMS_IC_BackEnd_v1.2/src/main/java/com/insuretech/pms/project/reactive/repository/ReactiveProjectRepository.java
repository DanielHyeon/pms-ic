package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveProjectRepository extends ReactiveCrudRepository<R2dbcProject, String> {

    Flux<R2dbcProject> findByStatusOrderByCreatedAtDesc(String status);

    Flux<R2dbcProject> findAllByOrderByCreatedAtDesc();

    Mono<R2dbcProject> findByIsDefaultTrue();

    @Query("UPDATE project.projects SET is_default = false WHERE is_default = true")
    Mono<Void> clearDefaultProject();

    @Query("UPDATE project.projects SET is_default = true WHERE id = :id")
    Mono<Void> setDefaultProject(String id);

    @Query("UPDATE project.projects SET progress = :progress WHERE id = :id")
    Mono<Void> updateProgress(String id, Integer progress);
}
