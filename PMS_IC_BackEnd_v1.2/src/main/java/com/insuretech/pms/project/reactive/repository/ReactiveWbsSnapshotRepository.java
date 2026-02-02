package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsSnapshot;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsSnapshotRepository extends ReactiveCrudRepository<R2dbcWbsSnapshot, String> {

    Flux<R2dbcWbsSnapshot> findByPhaseIdOrderByCreatedAtDesc(String phaseId);

    Flux<R2dbcWbsSnapshot> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcWbsSnapshot> findByPhaseIdAndStatusOrderByCreatedAtDesc(String phaseId, String status);

    Flux<R2dbcWbsSnapshot> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, String status);

    Mono<R2dbcWbsSnapshot> findByIdAndStatus(String id, String status);

    @Query("UPDATE project.wbs_snapshots SET status = :status WHERE id = :id")
    Mono<Void> updateStatus(String id, String status);

    @Query("UPDATE project.wbs_snapshots SET status = :status, restored_at = NOW(), restored_by = :restoredBy WHERE id = :id")
    Mono<Void> markAsRestored(String id, String status, String restoredBy);
}
