package com.insuretech.pms.chat.reactive.repository;

import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveChatSessionRepository extends ReactiveCrudRepository<R2dbcChatSession, String> {

    Flux<R2dbcChatSession> findByUserIdAndActiveTrue(String userId);

    Flux<R2dbcChatSession> findByUserIdOrderByCreatedAtDesc(String userId);

    Mono<R2dbcChatSession> findByIdAndActiveTrue(String id);

    @Query("UPDATE chat.chat_sessions SET active = false, updated_at = NOW() WHERE id = :id")
    Mono<Void> deactivateSession(String id);
}
