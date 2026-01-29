package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsDependency;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsDependencyRepository extends ReactiveCrudRepository<R2dbcWbsDependency, String> {

    Flux<R2dbcWbsDependency> findByProjectId(String projectId);

    Flux<R2dbcWbsDependency> findByPredecessorId(String predecessorId);

    Flux<R2dbcWbsDependency> findBySuccessorId(String successorId);

    Mono<R2dbcWbsDependency> findByPredecessorIdAndSuccessorId(String predecessorId, String successorId);

    @Query("SELECT * FROM project.wbs_dependencies WHERE predecessor_id = :itemId OR successor_id = :itemId")
    Flux<R2dbcWbsDependency> findByItemId(String itemId);

    Mono<Void> deleteByPredecessorIdAndSuccessorId(String predecessorId, String successorId);

    @Query("DELETE FROM project.wbs_dependencies WHERE project_id = :projectId")
    Mono<Void> deleteByProjectId(String projectId);
}
