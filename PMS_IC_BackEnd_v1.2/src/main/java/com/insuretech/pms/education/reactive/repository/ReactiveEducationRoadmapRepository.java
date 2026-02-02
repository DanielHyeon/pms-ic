package com.insuretech.pms.education.reactive.repository;

import com.insuretech.pms.education.reactive.entity.R2dbcEducationRoadmap;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveEducationRoadmapRepository extends ReactiveCrudRepository<R2dbcEducationRoadmap, String> {

    Flux<R2dbcEducationRoadmap> findByTargetRoleOrderByOrderNumAsc(String targetRole);

    Flux<R2dbcEducationRoadmap> findByEducationId(String educationId);

    Flux<R2dbcEducationRoadmap> findByTargetRoleAndLevelOrderByOrderNumAsc(String targetRole, String level);

    Flux<R2dbcEducationRoadmap> findByTargetRoleAndIsRequiredTrueOrderByOrderNumAsc(String targetRole);

    Flux<R2dbcEducationRoadmap> findByLevelOrderByOrderNumAsc(String level);
}
