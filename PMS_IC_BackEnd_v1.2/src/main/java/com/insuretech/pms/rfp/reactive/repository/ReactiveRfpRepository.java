package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcRfp;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveRfpRepository extends ReactiveCrudRepository<R2dbcRfp, String> {

    Flux<R2dbcRfp> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcRfp> findByProjectIdAndStatus(String projectId, String status);

    Mono<R2dbcRfp> findByIdAndProjectId(String id, String projectId);

    Flux<R2dbcRfp> findByTenantId(String tenantId);

    @Query("UPDATE project.rfps SET status = :status WHERE id = :id")
    Mono<Void> updateStatus(String id, String status);

    @Query("UPDATE project.rfps SET processing_status = :processingStatus, processing_message = :message WHERE id = :id")
    Mono<Void> updateProcessingStatus(String id, String processingStatus, String message);

    Mono<Long> countByProjectId(String projectId);

    Mono<Long> countByProjectIdAndStatus(String projectId, String status);
}
