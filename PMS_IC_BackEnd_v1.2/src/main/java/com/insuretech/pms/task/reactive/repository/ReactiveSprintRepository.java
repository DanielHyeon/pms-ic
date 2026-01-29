package com.insuretech.pms.task.reactive.repository;

import com.insuretech.pms.task.reactive.entity.R2dbcSprint;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveSprintRepository extends ReactiveCrudRepository<R2dbcSprint, String> {

    Flux<R2dbcSprint> findByProjectIdOrderByStartDateDesc(String projectId);

    Flux<R2dbcSprint> findByProjectIdAndStatus(String projectId, String status);

    Mono<R2dbcSprint> findByProjectIdAndStatusEquals(String projectId, String status);
}
