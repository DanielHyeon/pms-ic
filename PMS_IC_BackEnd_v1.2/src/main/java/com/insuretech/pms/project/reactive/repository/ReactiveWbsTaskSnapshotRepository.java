package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsTaskSnapshot;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsTaskSnapshotRepository extends ReactiveCrudRepository<R2dbcWbsTaskSnapshot, String> {

    Flux<R2dbcWbsTaskSnapshot> findBySnapshotIdOrderByOrderNumAsc(String snapshotId);

    Mono<Void> deleteBySnapshotId(String snapshotId);
}
