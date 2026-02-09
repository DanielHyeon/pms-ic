package com.insuretech.pms.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.ai.dto.AiBriefingResponseDto;
import com.insuretech.pms.ai.entity.R2dbcBriefingCache;
import com.insuretech.pms.ai.repository.BriefingCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

/**
 * Two-tier cache for AI briefings: Redis (hot) + PostgreSQL (cold-start fallback).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiBriefingCacheService {

    private final ReactiveRedisTemplate<String, Object> redisTemplate;
    private final BriefingCacheRepository dbCacheRepository;
    private final ObjectMapper objectMapper;

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);
    private static final String KEY_PREFIX = "ai:briefing:";

    private String cacheKey(String projectId, String role, String scope) {
        return KEY_PREFIX + projectId + ":" + role + ":" + scope;
    }

    /**
     * Get from Redis first, then fall back to DB.
     */
    public Mono<AiBriefingResponseDto> get(String projectId, String role, String scope) {
        String key = cacheKey(projectId, role, scope);
        return redisTemplate.opsForValue().get(key)
                .cast(String.class)
                .flatMap(json -> deserialize(json))
                .doOnSuccess(dto -> {
                    if (dto != null) log.debug("Redis cache hit: {}", key);
                })
                .switchIfEmpty(getFromDb(projectId, role, scope))
                .onErrorResume(e -> {
                    log.warn("Cache read error: {}", e.getMessage());
                    return getFromDb(projectId, role, scope);
                });
    }

    /**
     * Store in both Redis and DB.
     */
    public Mono<Void> store(String projectId, String role, String scope, AiBriefingResponseDto dto) {
        String key = cacheKey(projectId, role, scope);
        String json;
        try {
            json = objectMapper.writeValueAsString(dto);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize briefing: {}", e.getMessage());
            return Mono.empty();
        }

        Mono<Void> redisStore = redisTemplate.opsForValue()
                .set(key, json, CACHE_TTL)
                .doOnSuccess(ok -> log.debug("Stored in Redis: {}", key))
                .onErrorResume(e -> {
                    log.warn("Redis store failed: {}", e.getMessage());
                    return Mono.just(true);
                })
                .then();

        Mono<Void> dbStore = storeToDb(projectId, role, scope, json, dto);

        return Mono.when(redisStore, dbStore);
    }

    /**
     * Invalidate Redis cache for forced refresh.
     */
    public Mono<Boolean> invalidate(String projectId, String role, String scope) {
        String key = cacheKey(projectId, role, scope);
        return redisTemplate.delete(key)
                .map(count -> count > 0)
                .doOnSuccess(ok -> log.debug("Invalidated Redis cache: {}", key))
                .onErrorResume(e -> {
                    log.warn("Redis invalidation failed: {}", e.getMessage());
                    return Mono.just(false);
                });
    }

    private Mono<AiBriefingResponseDto> getFromDb(String projectId, String role, String scope) {
        return dbCacheRepository.findByProjectIdAndRoleAndScope(projectId, role, scope)
                .filter(cache -> {
                    // Only use DB cache if < 5 minutes old
                    OffsetDateTime fiveMinAgo = OffsetDateTime.now(ZoneId.of("Asia/Seoul")).minusMinutes(5);
                    return cache.getCreatedAt() != null && cache.getCreatedAt().isAfter(fiveMinAgo);
                })
                .flatMap(cache -> deserialize(cache.getResponseJson()))
                .doOnSuccess(dto -> {
                    if (dto != null) log.debug("DB cache hit for {}/{}/{}", projectId, role, scope);
                });
    }

    private Mono<Void> storeToDb(String projectId, String role, String scope,
                                  String json, AiBriefingResponseDto dto) {
        return dbCacheRepository.deleteByProjectIdAndRoleAndScope(projectId, role, scope)
                .then(Mono.defer(() -> {
                    R2dbcBriefingCache entity = R2dbcBriefingCache.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .role(role)
                            .scope(scope)
                            .asOf(OffsetDateTime.now(ZoneId.of("Asia/Seoul")))
                            .completeness(dto.context() != null ? dto.context().completeness() : "UNKNOWN")
                            .generationMethod(dto.explainability() != null
                                    ? dto.explainability().generationMethod() : "RULE_BASED")
                            .responseJson(json)
                            .createdAt(OffsetDateTime.now(ZoneId.of("Asia/Seoul")))
                            .isNew(true)
                            .build();
                    return dbCacheRepository.save(entity);
                }))
                .then()
                .onErrorResume(e -> {
                    log.warn("DB cache store failed: {}", e.getMessage());
                    return Mono.empty();
                });
    }

    private Mono<AiBriefingResponseDto> deserialize(String json) {
        if (json == null || json.isBlank()) return Mono.empty();
        try {
            return Mono.just(objectMapper.readValue(json, AiBriefingResponseDto.class));
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize briefing cache: {}", e.getMessage());
            return Mono.empty();
        }
    }
}
