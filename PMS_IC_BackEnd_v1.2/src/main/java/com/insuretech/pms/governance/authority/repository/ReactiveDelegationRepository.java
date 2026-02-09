package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcDelegation;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ReactiveDelegationRepository extends ReactiveCrudRepository<R2dbcDelegation, String> {

    Flux<R2dbcDelegation> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcDelegation> findByProjectIdAndStatus(String projectId, String status);

    @Query("SELECT * FROM governance.delegations WHERE project_id = :projectId AND delegatee_id = :delegateeId AND status = 'ACTIVE'")
    Flux<R2dbcDelegation> findActiveByProjectIdAndDelegateeId(String projectId, String delegateeId);

    @Query("SELECT * FROM governance.delegations WHERE parent_delegation_id = :parentId AND status IN ('ACTIVE', 'PENDING')")
    Flux<R2dbcDelegation> findActiveChildDelegations(String parentId);

    @Query("SELECT * FROM governance.delegations WHERE project_id = :projectId AND status = 'ACTIVE' AND duration_type = 'TEMPORARY' AND end_at <= CURRENT_DATE")
    Flux<R2dbcDelegation> findExpiredTemporaryDelegations(String projectId);

    @Query("SELECT count(*) FROM governance.delegations WHERE project_id = :projectId AND status = 'ACTIVE'")
    Mono<Long> countActiveByProjectId(String projectId);
}
