package com.insuretech.pms.governance.organization.repository;

import com.insuretech.pms.governance.organization.entity.R2dbcPartMembership;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ReactivePartMembershipRepository extends ReactiveCrudRepository<R2dbcPartMembership, String> {

    @Query("SELECT * FROM organization.part_memberships WHERE part_id = :partId AND left_at IS NULL")
    Flux<R2dbcPartMembership> findActiveByPartId(String partId);

    @Query("SELECT * FROM organization.part_memberships WHERE project_id = :projectId AND user_id = :userId AND left_at IS NULL")
    Flux<R2dbcPartMembership> findActiveByProjectIdAndUserId(String projectId, String userId);

    @Query("SELECT count(*) FROM organization.part_memberships WHERE part_id = :partId AND left_at IS NULL")
    Mono<Long> countActiveByPartId(String partId);

    @Query("SELECT * FROM organization.part_memberships WHERE part_id = :partId AND user_id = :userId AND left_at IS NULL")
    Mono<R2dbcPartMembership> findActiveByPartIdAndUserId(String partId, String userId);

    @Query("SELECT * FROM organization.part_memberships WHERE project_id = :projectId AND user_id = :userId AND membership_type = 'PRIMARY' AND left_at IS NULL")
    Mono<R2dbcPartMembership> findActivePrimaryByProjectIdAndUserId(String projectId, String userId);
}
