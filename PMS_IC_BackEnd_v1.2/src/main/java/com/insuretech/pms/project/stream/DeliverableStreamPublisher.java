package com.insuretech.pms.project.stream;

import com.insuretech.pms.project.reactive.entity.R2dbcDeliverableOutbox;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Publishes deliverable outbox events to Redis Streams.
 *
 * This service is responsible for relaying events from the outbox table
 * to Redis Streams for distributed, reliable processing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeliverableStreamPublisher {

    private final ReactiveRedisTemplate<String, Object> redisTemplate;

    /**
     * Publish an outbox event to Redis Streams.
     *
     * @param event The outbox event to publish
     * @return Mono with the Redis Stream record ID
     */
    public Mono<RecordId> publishEvent(R2dbcDeliverableOutbox event) {
        DeliverableStreamEvent streamEvent = DeliverableStreamEvent.builder()
                .eventId(event.getId())
                .deliverableId(event.getAggregateId())
                .eventType(event.getEventType())
                .payload(event.getPayload())
                .projectId(event.getProjectId())
                .ragDocId("deliverable:" + event.getAggregateId())
                .createdAt(event.getCreatedAt() != null ? event.getCreatedAt().toString() : null)
                .retryCount(event.getRetryCount())
                .build();

        ObjectRecord<String, DeliverableStreamEvent> record = StreamRecords
                .newRecord()
                .ofObject(streamEvent)
                .withStreamKey(RedisStreamConfig.DELIVERABLE_STREAM_KEY);

        return redisTemplate.opsForStream()
                .add(record)
                .doOnSuccess(recordId -> log.info("Published event {} to stream with ID: {}",
                        event.getId(), recordId))
                .doOnError(e -> log.error("Failed to publish event {} to stream: {}",
                        event.getId(), e.getMessage()));
    }

    /**
     * Ensure the consumer group exists, creating it if necessary.
     *
     * @return Mono indicating completion
     */
    public Mono<String> ensureConsumerGroup() {
        return redisTemplate.opsForStream()
                .createGroup(
                        RedisStreamConfig.DELIVERABLE_STREAM_KEY,
                        RedisStreamConfig.CONSUMER_GROUP
                )
                .onErrorResume(e -> {
                    // Group may already exist, which is fine
                    if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                        log.debug("Consumer group already exists: {}", RedisStreamConfig.CONSUMER_GROUP);
                        return Mono.just("OK");
                    }
                    return Mono.error(e);
                })
                .doOnSuccess(result -> log.info("Consumer group ensured: {}", RedisStreamConfig.CONSUMER_GROUP));
    }

    /**
     * Get stream info/stats.
     *
     * @return Mono with stream length
     */
    public Mono<Long> getStreamLength() {
        return redisTemplate.opsForStream()
                .size(RedisStreamConfig.DELIVERABLE_STREAM_KEY);
    }

    /**
     * Trim the stream to a maximum length (for maintenance).
     *
     * @param maxLength Maximum number of entries to keep
     * @return Mono with number of entries removed
     */
    public Mono<Long> trimStream(long maxLength) {
        return redisTemplate.opsForStream()
                .trim(RedisStreamConfig.DELIVERABLE_STREAM_KEY, maxLength)
                .doOnSuccess(removed -> log.info("Trimmed {} entries from stream", removed));
    }
}
