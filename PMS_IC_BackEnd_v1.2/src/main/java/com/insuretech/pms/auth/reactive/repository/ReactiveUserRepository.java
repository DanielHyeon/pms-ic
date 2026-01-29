package com.insuretech.pms.auth.reactive.repository;

import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveUserRepository extends ReactiveCrudRepository<R2dbcUser, String> {

    Mono<R2dbcUser> findByEmail(String email);

    Mono<R2dbcUser> findByEmailAndActiveTrue(String email);

    Mono<Boolean> existsByEmail(String email);

    Flux<R2dbcUser> findByActiveTrue();

    Flux<R2dbcUser> findByRole(String role);

    @Query("UPDATE auth.users SET last_login_at = NOW() WHERE id = :id")
    Mono<Void> updateLastLoginAt(String id);

    @Query("UPDATE auth.users SET active = :active, updated_at = NOW() WHERE id = :id")
    Mono<Void> updateActiveStatus(String id, boolean active);
}
