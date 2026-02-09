package com.insuretech.pms.governance.accountability.repository;

import com.insuretech.pms.governance.accountability.entity.R2dbcAccountabilityChangeLog;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveAccountabilityChangeLogRepository
        extends ReactiveCrudRepository<R2dbcAccountabilityChangeLog, String> {

    Flux<R2dbcAccountabilityChangeLog> findByProjectIdOrderByChangedAtDesc(String projectId);
}
