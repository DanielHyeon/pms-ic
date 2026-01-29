package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsDependencySnapshot;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveWbsDependencySnapshotRepository extends ReactiveCrudRepository<R2dbcWbsDependencySnapshot, String> {

    Flux<R2dbcWbsDependencySnapshot> findBySnapshotId(String snapshotId);

    Mono<Void> deleteBySnapshotId(String snapshotId);
}
