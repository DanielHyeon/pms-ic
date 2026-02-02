package com.insuretech.pms.task.reactive.repository;

import com.insuretech.pms.task.reactive.entity.R2dbcKanbanColumn;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveKanbanColumnRepository extends ReactiveCrudRepository<R2dbcKanbanColumn, String> {

    Flux<R2dbcKanbanColumn> findByProjectIdOrderByOrderNumAsc(String projectId);
}
