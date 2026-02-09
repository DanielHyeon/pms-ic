package com.insuretech.pms.ai.repository;

import com.insuretech.pms.ai.entity.R2dbcBriefingCache;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface BriefingCacheRepository extends ReactiveCrudRepository<R2dbcBriefingCache, String> {

    Mono<R2dbcBriefingCache> findByProjectIdAndRoleAndScope(String projectId, String role, String scope);

    Mono<Void> deleteByProjectIdAndRoleAndScope(String projectId, String role, String scope);
}
