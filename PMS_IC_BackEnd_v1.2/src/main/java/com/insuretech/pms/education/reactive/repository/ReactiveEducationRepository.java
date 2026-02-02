package com.insuretech.pms.education.reactive.repository;

import com.insuretech.pms.education.reactive.entity.R2dbcEducation;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveEducationRepository extends ReactiveCrudRepository<R2dbcEducation, String> {

    Flux<R2dbcEducation> findByEducationType(String educationType);

    Flux<R2dbcEducation> findByCategory(String category);

    Flux<R2dbcEducation> findByTargetRole(String targetRole);

    Flux<R2dbcEducation> findByIsActiveTrue();

    Flux<R2dbcEducation> findByEducationTypeAndIsActiveTrue(String educationType);

    @Query("SELECT * FROM project.educations WHERE is_active = true ORDER BY created_at DESC")
    Flux<R2dbcEducation> findAllActive();

    Mono<Long> countByIsActiveTrue();

    Mono<Long> countByCategory(String category);
}
