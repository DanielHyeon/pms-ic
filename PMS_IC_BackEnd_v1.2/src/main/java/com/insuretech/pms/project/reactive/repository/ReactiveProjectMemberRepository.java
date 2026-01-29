package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcProjectMember;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveProjectMemberRepository extends ReactiveCrudRepository<R2dbcProjectMember, String> {

    Flux<R2dbcProjectMember> findByProjectIdAndActiveTrue(String projectId);

    Flux<R2dbcProjectMember> findByUserIdAndActiveTrue(String userId);

    Mono<R2dbcProjectMember> findByProjectIdAndUserId(String projectId, String userId);

    Mono<R2dbcProjectMember> findByProjectIdAndUserIdAndActiveTrue(String projectId, String userId);

    Mono<Boolean> existsByProjectIdAndUserId(String projectId, String userId);

    Mono<Boolean> existsByProjectIdAndUserIdAndActiveTrue(String projectId, String userId);

    @Query("UPDATE project.project_members SET active = false WHERE project_id = :projectId AND user_id = :userId")
    Mono<Void> deactivateMember(String projectId, String userId);

    @Query("SELECT DISTINCT pm.project_id FROM project.project_members pm WHERE pm.user_id = :userId AND pm.active = true")
    Flux<String> findActiveProjectIdsForUser(String userId);
}
