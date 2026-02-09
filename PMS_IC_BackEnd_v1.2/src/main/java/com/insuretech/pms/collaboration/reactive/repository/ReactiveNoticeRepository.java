package com.insuretech.pms.collaboration.reactive.repository;

import com.insuretech.pms.collaboration.reactive.entity.R2dbcNotice;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveNoticeRepository extends ReactiveCrudRepository<R2dbcNotice, String> {

    Flux<R2dbcNotice> findByProjectIdOrderByPinnedDescCreatedAtDesc(String projectId);

    Flux<R2dbcNotice> findByProjectIdAndStatusOrderByPinnedDescCreatedAtDesc(String projectId, String status);

    Flux<R2dbcNotice> findByProjectIdAndCategoryOrderByCreatedAtDesc(String projectId, String category);
}
