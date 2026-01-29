package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsItemSnapshot;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsItemSnapshotRepository extends ReactiveCrudRepository<R2dbcWbsItemSnapshot, String> {

    Flux<R2dbcWbsItemSnapshot> findBySnapshotIdOrderByOrderNumAsc(String snapshotId);

    Mono<Void> deleteBySnapshotId(String snapshotId);
}
