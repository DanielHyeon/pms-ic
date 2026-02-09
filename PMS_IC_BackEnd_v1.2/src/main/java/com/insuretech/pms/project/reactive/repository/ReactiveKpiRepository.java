package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcKpi;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveKpiRepository extends ReactiveCrudRepository<R2dbcKpi, String> {

    Flux<R2dbcKpi> findByProjectId(String projectId);

    Flux<R2dbcKpi> findByProjectIdAndStatus(String projectId, String status);
}
