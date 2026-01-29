package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsGroupSnapshot;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsGroupSnapshotRepository extends ReactiveCrudRepository<R2dbcWbsGroupSnapshot, String> {

    Flux<R2dbcWbsGroupSnapshot> findBySnapshotIdOrderByOrderNumAsc(String snapshotId);

    Mono<Void> deleteBySnapshotId(String snapshotId);
}
