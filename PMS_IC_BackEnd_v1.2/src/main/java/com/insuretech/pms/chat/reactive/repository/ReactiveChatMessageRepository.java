package com.insuretech.pms.chat.reactive.repository;

import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveChatMessageRepository extends ReactiveCrudRepository<R2dbcChatMessage, String> {

    Flux<R2dbcChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    Flux<R2dbcChatMessage> findBySessionIdOrderByCreatedAtDesc(String sessionId);

    @Query("SELECT * FROM chat.chat_messages WHERE session_id = :sessionId ORDER BY created_at DESC LIMIT :limit")
    Flux<R2dbcChatMessage> findRecentBySessionId(String sessionId, int limit);

    Mono<Long> countBySessionId(String sessionId);

    Mono<Void> deleteBySessionId(String sessionId);
}
