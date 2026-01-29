package com.insuretech.pms.chat.cache;

import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/**
 * Reactive caching service for chat data
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveChatCacheService {

    private final ReactiveRedisTemplate<String, Object> redisTemplate;

    private static final String SESSION_KEY_PREFIX = "chat:session:";
    private static final String MESSAGES_KEY_PREFIX = "chat:messages:";
    private static final String USER_SESSIONS_KEY_PREFIX = "chat:user:sessions:";

    private static final Duration SESSION_TTL = Duration.ofHours(24);
    private static final Duration MESSAGES_TTL = Duration.ofHours(2);

    // Session caching
    public Mono<R2dbcChatSession> cacheSession(R2dbcChatSession session) {
        String key = SESSION_KEY_PREFIX + session.getId();
        return redisTemplate.opsForValue()
                .set(key, session, SESSION_TTL)
                .thenReturn(session)
                .doOnSuccess(s -> log.debug("Cached session: {}", s.getId()))
                .onErrorResume(e -> {
                    log.warn("Failed to cache session: {}", e.getMessage());
                    return Mono.just(session);
                });
    }

    public Mono<R2dbcChatSession> getSession(String sessionId) {
        String key = SESSION_KEY_PREFIX + sessionId;
        return redisTemplate.opsForValue()
                .get(key)
                .cast(R2dbcChatSession.class)
                .doOnSuccess(s -> {
                    if (s != null) log.debug("Cache hit for session: {}", sessionId);
                });
    }

    public Mono<Boolean> invalidateSession(String sessionId) {
        String key = SESSION_KEY_PREFIX + sessionId;
        return redisTemplate.delete(key)
                .map(count -> count > 0)
                .doOnSuccess(deleted -> log.debug("Invalidated session cache: {}", sessionId));
    }

    // Message caching
    public Mono<Void> cacheRecentMessages(String sessionId, List<R2dbcChatMessage> messages) {
        String key = MESSAGES_KEY_PREFIX + sessionId;
        return redisTemplate.delete(key)
                .then(Flux.fromIterable(messages)
                        .flatMap(msg -> redisTemplate.opsForList().rightPush(key, msg))
                        .then())
                .then(redisTemplate.expire(key, MESSAGES_TTL))
                .then()
                .doOnSuccess(v -> log.debug("Cached {} messages for session: {}", messages.size(), sessionId))
                .onErrorResume(e -> {
                    log.warn("Failed to cache messages: {}", e.getMessage());
                    return Mono.empty();
                });
    }

    public Flux<R2dbcChatMessage> getCachedMessages(String sessionId) {
        String key = MESSAGES_KEY_PREFIX + sessionId;
        return redisTemplate.opsForList()
                .range(key, 0, -1)
                .cast(R2dbcChatMessage.class);
    }

    public Mono<Boolean> appendMessage(String sessionId, R2dbcChatMessage message) {
        String key = MESSAGES_KEY_PREFIX + sessionId;
        return redisTemplate.opsForList()
                .rightPush(key, message)
                .then(redisTemplate.expire(key, MESSAGES_TTL))
                .thenReturn(true)
                .onErrorReturn(false);
    }

    public Mono<Void> invalidateMessages(String sessionId) {
        String key = MESSAGES_KEY_PREFIX + sessionId;
        return redisTemplate.delete(key)
                .then()
                .doOnSuccess(v -> log.debug("Invalidated message cache: {}", sessionId));
    }

    // User sessions index
    public Mono<Void> indexUserSession(String userId, String sessionId) {
        String key = USER_SESSIONS_KEY_PREFIX + userId;
        return redisTemplate.opsForSet()
                .add(key, sessionId)
                .then(redisTemplate.expire(key, SESSION_TTL))
                .then();
    }

    public Flux<String> getUserSessionIds(String userId) {
        String key = USER_SESSIONS_KEY_PREFIX + userId;
        return redisTemplate.opsForSet()
                .members(key)
                .map(Object::toString);
    }

    public Mono<Void> removeUserSession(String userId, String sessionId) {
        String key = USER_SESSIONS_KEY_PREFIX + userId;
        return redisTemplate.opsForSet()
                .remove(key, sessionId)
                .then();
    }
}
