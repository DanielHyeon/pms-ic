package com.insuretech.pms.rfp.reactive.repository;

import com.insuretech.pms.rfp.reactive.entity.R2dbcDocumentChunk;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveDocumentChunkRepository extends ReactiveCrudRepository<R2dbcDocumentChunk, String> {

    Flux<R2dbcDocumentChunk> findByRfpIdOrderByChunkOrderAsc(String rfpId);

    Flux<R2dbcDocumentChunk> findByRfpIdAndSectionId(String rfpId, String sectionId);

    Mono<Void> deleteByRfpId(String rfpId);
}
