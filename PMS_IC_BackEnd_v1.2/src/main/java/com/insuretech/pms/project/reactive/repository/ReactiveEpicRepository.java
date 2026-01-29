package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcEpic;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveEpicRepository extends ReactiveCrudRepository<R2dbcEpic, String> {

    Flux<R2dbcEpic> findByProjectId(String projectId);

    @Query("SELECT * FROM project.epics WHERE project_id = :projectId AND status = 'ACTIVE' ORDER BY business_value DESC NULLS LAST")
    Flux<R2dbcEpic> findActiveEpicsByProjectId(String projectId);

    Mono<R2dbcEpic> findByProjectIdAndName(String projectId, String name);

    @Query("SELECT * FROM project.epics WHERE project_id = :projectId AND status = :status ORDER BY name ASC")
    Flux<R2dbcEpic> findByProjectIdAndStatus(String projectId, String status);

    @Query("SELECT COUNT(*) FROM project.epics WHERE project_id = :projectId AND status = :status")
    Mono<Long> countByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcEpic> findByProjectIdAndOwnerId(String projectId, String ownerId);

    Mono<Boolean> existsByProjectIdAndName(String projectId, String name);

    Flux<R2dbcEpic> findByPhaseId(String phaseId);

    @Query("SELECT * FROM project.epics WHERE project_id = :projectId AND phase_id IS NULL ORDER BY name ASC")
    Flux<R2dbcEpic> findUnlinkedByProjectId(String projectId);

    Mono<Long> countByPhaseId(String phaseId);
}
