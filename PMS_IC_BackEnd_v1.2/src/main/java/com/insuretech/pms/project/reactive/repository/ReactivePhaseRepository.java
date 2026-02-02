package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcPhase;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactivePhaseRepository extends ReactiveCrudRepository<R2dbcPhase, String> {

    Flux<R2dbcPhase> findByProjectIdOrderByOrderNumAsc(String projectId);

    Flux<R2dbcPhase> findByProjectIdAndStatusOrderByOrderNumAsc(String projectId, String status);

    Mono<Integer> countByProjectId(String projectId);

    @Query("UPDATE project.phases SET progress = :progress WHERE id = :id")
    Mono<Void> updateProgress(String id, Integer progress);

    @Query("UPDATE project.phases SET status = :status WHERE id = :id")
    Mono<Void> updateStatus(String id, String status);

    Mono<Void> deleteByProjectId(String projectId);
}
