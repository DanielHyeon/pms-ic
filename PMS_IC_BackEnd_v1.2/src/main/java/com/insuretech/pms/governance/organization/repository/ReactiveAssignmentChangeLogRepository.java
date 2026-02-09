package com.insuretech.pms.governance.organization.repository;

import com.insuretech.pms.governance.organization.entity.R2dbcAssignmentChangeLog;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveAssignmentChangeLogRepository extends ReactiveCrudRepository<R2dbcAssignmentChangeLog, String> {

    Flux<R2dbcAssignmentChangeLog> findByProjectIdOrderByChangedAtDesc(String projectId);
}
