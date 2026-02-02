package com.insuretech.pms.auth.reactive.repository;

import com.insuretech.pms.auth.reactive.entity.R2dbcPermission;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactivePermissionRepository extends ReactiveCrudRepository<R2dbcPermission, String> {

    Flux<R2dbcPermission> findByCategory(String category);

    Flux<R2dbcPermission> findAllByOrderByCategoryAscNameAsc();

    Flux<R2dbcPermission> findByResource(String resource);
}
