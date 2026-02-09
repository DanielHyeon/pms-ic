package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcRfpVersion;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveRfpVersionRepository extends ReactiveCrudRepository<R2dbcRfpVersion, String> {

    Flux<R2dbcRfpVersion> findByRfpIdOrderByUploadedAtDesc(String rfpId);

    Mono<R2dbcRfpVersion> findByRfpIdAndVersionLabel(String rfpId, String versionLabel);

    Mono<Long> countByRfpId(String rfpId);
}
