package com.insuretech.pms.project.stream;

import org.springframework.context.annotation.Configuration;

/**
 * Redis Streams configuration for deliverable outbox event processing.
 *
 * Uses consumer groups for reliable, distributed event processing with:
 * - Automatic acknowledgment after successful processing
 * - Pending message handling for failed consumers
 * - Stream trimming to prevent unbounded growth
 */
@Configuration
public class RedisStreamConfig {

    public static final String DELIVERABLE_STREAM_KEY = "deliverable:outbox:events";
    public static final String CONSUMER_GROUP = "rag-indexing-group";
}
