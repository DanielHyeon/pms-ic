# Phase 4: Optimization

## Full Reactive Stack & Production Readiness

---

## Overview

| Attribute | Value |
|-----------|-------|
| Phase | 4 of 4 |
| Focus | R2DBC migration, Reactive Neo4j, observability, performance |
| Dependencies | Phase 1, 2, 3 completed |
| Deliverables | Production-ready, fully reactive, observable system |

---

## Objectives

1. Complete R2DBC migration for all persistence
2. Integrate Reactive Neo4j for graph queries
3. Implement comprehensive observability (metrics, tracing, logging)
4. Performance tuning and load testing
5. Production hardening and deployment optimization

---

## Task 4.1: R2DBC Full Migration

### Description

Migrate all blocking JPA repositories to R2DBC for true end-to-end non-blocking.

### Current State Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Current (Mixed Blocking/Non-blocking)                 │
└─────────────────────────────────────────────────────────────────────────┘

WebFlux Controller
    │
    ▼ (reactive)
Service Layer
    │
    ├── WebClient → Gateway  (non-blocking ✓)
    │
    └── JPA Repository       (BLOCKING ✗)
            │
            └── Schedulers.boundedElastic() (workaround)


┌─────────────────────────────────────────────────────────────────────────┐
│                    Target (Fully Non-blocking)                           │
└─────────────────────────────────────────────────────────────────────────┘

WebFlux Controller
    │
    ▼ (reactive)
Service Layer
    │
    ├── WebClient → Gateway  (non-blocking ✓)
    │
    └── R2DBC Repository     (non-blocking ✓)
            │
            └── PostgreSQL R2DBC Driver
```

### Deliverables

#### 4.1.1 R2DBC Configuration

```java
// config/R2dbcConfig.java
@Configuration
@EnableR2dbcRepositories(basePackages = "com.insuretech.pms")
@EnableR2dbcAuditing
public class R2dbcConfig extends AbstractR2dbcConfiguration {

    @Value("${spring.r2dbc.url}")
    private String url;

    @Value("${spring.r2dbc.username}")
    private String username;

    @Value("${spring.r2dbc.password}")
    private String password;

    @Override
    public ConnectionFactory connectionFactory() {
        return ConnectionFactories.get(ConnectionFactoryOptions.builder()
            .option(DRIVER, "postgresql")
            .option(HOST, extractHost(url))
            .option(PORT, extractPort(url))
            .option(DATABASE, extractDatabase(url))
            .option(USER, username)
            .option(PASSWORD, password)
            .option(CONNECT_TIMEOUT, Duration.ofSeconds(10))
            .option(STATEMENT_TIMEOUT, Duration.ofSeconds(30))
            .build());
    }

    @Bean
    public R2dbcEntityOperations r2dbcEntityOperations(
            R2dbcEntityTemplate template) {
        return template;
    }

    @Bean
    public ReactiveTransactionManager transactionManager(
            ConnectionFactory connectionFactory) {
        return new R2dbcTransactionManager(connectionFactory);
    }

    @Bean
    public ConnectionPoolConfiguration poolConfiguration() {
        return ConnectionPoolConfiguration.builder()
            .maxSize(20)
            .initialSize(5)
            .maxIdleTime(Duration.ofMinutes(10))
            .maxLifeTime(Duration.ofMinutes(30))
            .validationQuery("SELECT 1")
            .build();
    }
}
```

#### 4.1.2 Application Configuration

```yaml
# application.yml
spring:
  r2dbc:
    url: r2dbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5433}/${DB_NAME:pms}
    username: ${DB_USERNAME:pms_user}
    password: ${DB_PASSWORD:pms_password}
    pool:
      enabled: true
      initial-size: 5
      max-size: 20
      max-idle-time: 10m
      max-life-time: 30m
      validation-query: SELECT 1

  # Disable JPA auto-configuration
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
      - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
```

#### 4.1.3 R2DBC Entity Definitions

```java
// domain/ChatSession.java
@Data
@Builder
@Table("chat_sessions")
public class ChatSession {
    @Id
    private Long id;

    @Column("session_id")
    private String sessionId;

    @Column("user_id")
    private String userId;

    @Column("project_id")
    private String projectId;

    @Column("title")
    private String title;

    @Column("engine_preference")
    private String enginePreference;

    @CreatedDate
    @Column("created_at")
    private Instant createdAt;

    @LastModifiedDate
    @Column("updated_at")
    private Instant updatedAt;

    @Column("message_count")
    private Integer messageCount;

    @Column("is_active")
    private Boolean isActive;
}

// domain/ChatMessage.java
@Data
@Builder
@Table("chat_messages")
public class ChatMessage {
    @Id
    private Long id;

    @Column("session_id")
    private String sessionId;

    @Column("role")
    private String role;  // user, assistant, system, tool

    @Column("content")
    private String content;

    @Column("tool_calls")
    private String toolCalls;  // JSON

    @Column("tool_call_id")
    private String toolCallId;

    @Column("engine")
    private String engine;

    @Column("trace_id")
    private String traceId;

    @Column("tokens")
    private Integer tokens;

    @CreatedDate
    @Column("created_at")
    private Instant createdAt;
}
```

#### 4.1.4 R2DBC Repositories

```java
// repository/ReactiveChatSessionRepository.java
public interface ReactiveChatSessionRepository
        extends ReactiveCrudRepository<ChatSession, Long> {

    Mono<ChatSession> findBySessionId(String sessionId);

    Flux<ChatSession> findByUserIdOrderByUpdatedAtDesc(String userId);

    Flux<ChatSession> findByUserIdAndIsActiveTrue(String userId);

    @Query("""
        SELECT * FROM chat_sessions
        WHERE user_id = :userId
        AND project_id = :projectId
        ORDER BY updated_at DESC
        LIMIT :limit
        """)
    Flux<ChatSession> findRecentByUserAndProject(
        String userId, String projectId, int limit);

    @Modifying
    @Query("UPDATE chat_sessions SET message_count = message_count + 1, updated_at = NOW() WHERE session_id = :sessionId")
    Mono<Integer> incrementMessageCount(String sessionId);

    @Modifying
    @Query("UPDATE chat_sessions SET is_active = false WHERE session_id = :sessionId")
    Mono<Integer> deactivateSession(String sessionId);
}

// repository/ReactiveChatMessageRepository.java
public interface ReactiveChatMessageRepository
        extends ReactiveCrudRepository<ChatMessage, Long> {

    Flux<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    @Query("""
        SELECT * FROM chat_messages
        WHERE session_id = :sessionId
        ORDER BY created_at DESC
        LIMIT :limit
        """)
    Flux<ChatMessage> findRecentBySessionId(String sessionId, int limit);

    Mono<Long> countBySessionId(String sessionId);

    @Query("""
        SELECT * FROM chat_messages
        WHERE session_id = :sessionId
        AND role IN ('user', 'assistant')
        ORDER BY created_at DESC
        LIMIT :limit
        """)
    Flux<ChatMessage> findConversationHistory(String sessionId, int limit);

    Flux<ChatMessage> findByTraceId(String traceId);
}
```

#### 4.1.5 Reactive Session Service

```java
// service/ReactiveChatSessionService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ReactiveChatSessionService {

    private final ReactiveChatSessionRepository sessionRepository;
    private final ReactiveChatMessageRepository messageRepository;

    public Mono<String> ensureSession(String sessionId, String userId) {
        if (sessionId != null && !sessionId.isBlank()) {
            return sessionRepository.findBySessionId(sessionId)
                .map(ChatSession::getSessionId)
                .switchIfEmpty(createSession(userId));
        }
        return createSession(userId);
    }

    private Mono<String> createSession(String userId) {
        String newSessionId = UUID.randomUUID().toString();
        ChatSession session = ChatSession.builder()
            .sessionId(newSessionId)
            .userId(userId)
            .messageCount(0)
            .isActive(true)
            .build();

        return sessionRepository.save(session)
            .map(ChatSession::getSessionId)
            .doOnSuccess(id -> log.debug("Created session: {}", id));
    }

    public Mono<Void> saveMessage(String sessionId, String role, String content) {
        ChatMessage message = ChatMessage.builder()
            .sessionId(sessionId)
            .role(role)
            .content(content)
            .build();

        return messageRepository.save(message)
            .then(sessionRepository.incrementMessageCount(sessionId))
            .then()
            .doOnSuccess(v -> log.debug("Saved message: session={}, role={}", sessionId, role));
    }

    public Flux<ChatMessage> getHistory(String sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public Flux<ChatMessage> getRecentHistory(String sessionId, int limit) {
        return messageRepository.findRecentBySessionId(sessionId, limit)
            .collectList()
            .flatMapMany(list -> {
                Collections.reverse(list);
                return Flux.fromIterable(list);
            });
    }

    public Mono<Void> deleteSession(String sessionId) {
        return sessionRepository.deactivateSession(sessionId)
            .then()
            .doOnSuccess(v -> log.info("Deactivated session: {}", sessionId));
    }
}
```

### Acceptance Criteria

- [ ] All JPA repositories migrated to R2DBC
- [ ] No `Schedulers.boundedElastic()` workarounds
- [ ] Connection pooling configured
- [ ] Transactions work correctly
- [ ] Performance improved vs JPA

---

## Task 4.2: Reactive Neo4j Integration

### Description

Integrate Spring Data Neo4j with reactive support for graph-based RAG queries.

### Deliverables

#### 4.2.1 Neo4j Configuration

```java
// config/ReactiveNeo4jConfig.java
@Configuration
@EnableReactiveNeo4jRepositories(basePackages = "com.insuretech.pms.graph")
public class ReactiveNeo4jConfig extends AbstractReactiveNeo4jConfig {

    @Value("${spring.neo4j.uri}")
    private String uri;

    @Value("${spring.neo4j.authentication.username}")
    private String username;

    @Value("${spring.neo4j.authentication.password}")
    private String password;

    @Override
    public Driver driver() {
        return GraphDatabase.driver(uri, AuthTokens.basic(username, password),
            Config.builder()
                .withMaxConnectionPoolSize(50)
                .withConnectionAcquisitionTimeout(30, TimeUnit.SECONDS)
                .withConnectionTimeout(10, TimeUnit.SECONDS)
                .withFetchSize(1000)
                .build());
    }

    @Bean
    public ReactiveNeo4jClient reactiveNeo4jClient(Driver driver) {
        return ReactiveNeo4jClient.create(driver);
    }

    @Bean
    public ReactiveTransactionManager reactiveTransactionManager(
            Driver driver,
            ReactiveDatabaseSelectionProvider databaseSelectionProvider) {
        return new ReactiveNeo4jTransactionManager(driver, databaseSelectionProvider);
    }
}
```

#### 4.2.2 Application Configuration

```yaml
# application.yml
spring:
  neo4j:
    uri: ${NEO4J_URI:bolt://localhost:7687}
    authentication:
      username: ${NEO4J_USERNAME:neo4j}
      password: ${NEO4J_PASSWORD:password}
    pool:
      max-connection-pool-size: 50
      connection-acquisition-timeout: 30s
```

#### 4.2.3 Graph Entities

```java
// graph/domain/DocumentNode.java
@Node("Document")
@Data
@Builder
public class DocumentNode {
    @Id
    @GeneratedValue
    private Long id;

    @Property("documentId")
    private String documentId;

    @Property("title")
    private String title;

    @Property("type")
    private String type;

    @Property("projectId")
    private String projectId;

    @Property("content")
    private String content;

    @Property("excerpt")
    private String excerpt;

    @Property("embedding")
    private float[] embedding;

    @Property("createdAt")
    private Instant createdAt;

    @Relationship(type = "REFERENCES", direction = Relationship.Direction.OUTGOING)
    private List<DocumentNode> references;

    @Relationship(type = "BELONGS_TO", direction = Relationship.Direction.OUTGOING)
    private ProjectNode project;
}

// graph/domain/ProjectNode.java
@Node("Project")
@Data
@Builder
public class ProjectNode {
    @Id
    @GeneratedValue
    private Long id;

    @Property("projectId")
    private String projectId;

    @Property("name")
    private String name;

    @Property("status")
    private String status;

    @Relationship(type = "HAS_DOCUMENT", direction = Relationship.Direction.OUTGOING)
    private List<DocumentNode> documents;

    @Relationship(type = "HAS_PHASE", direction = Relationship.Direction.OUTGOING)
    private List<PhaseNode> phases;
}
```

#### 4.2.4 Reactive Neo4j Repository

```java
// graph/repository/ReactiveDocumentRepository.java
public interface ReactiveDocumentRepository
        extends ReactiveNeo4jRepository<DocumentNode, Long> {

    Flux<DocumentNode> findByProjectId(String projectId);

    Flux<DocumentNode> findByType(String type);

    @Query("""
        CALL db.index.vector.queryNodes('document_embeddings', $k, $queryVector)
        YIELD node, score
        WHERE node.projectId = $projectId OR $projectId IS NULL
        RETURN node, score
        ORDER BY score DESC
        """)
    Flux<DocumentWithScore> findSimilarDocuments(
        float[] queryVector,
        String projectId,
        int k);

    @Query("""
        MATCH (d:Document {projectId: $projectId})
        OPTIONAL MATCH (d)-[:REFERENCES]->(ref:Document)
        RETURN d, collect(ref) as references
        """)
    Flux<DocumentNode> findWithReferences(String projectId);
}

// graph/dto/DocumentWithScore.java
@Data
public class DocumentWithScore {
    private DocumentNode node;
    private Double score;
}
```

#### 4.2.5 RAG Service with Reactive Neo4j

```java
// service/ReactiveRagService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ReactiveRagService {

    private final ReactiveDocumentRepository documentRepository;
    private final EmbeddingService embeddingService;
    private final ReactiveNeo4jClient neo4jClient;

    @Value("${rag.top-k:5}")
    private int topK;

    @Value("${rag.score-threshold:0.7}")
    private double scoreThreshold;

    public Flux<RetrievedDocument> retrieveRelevantDocuments(
            String query,
            String projectId,
            int accessLevel) {

        return embeddingService.embed(query)
            .flatMapMany(embedding ->
                documentRepository.findSimilarDocuments(embedding, projectId, topK))
            .filter(doc -> doc.getScore() >= scoreThreshold)
            .filter(doc -> hasAccess(doc.getNode(), accessLevel))
            .map(this::toRetrievedDocument)
            .doOnNext(doc ->
                log.debug("Retrieved doc: {} (score={})", doc.getTitle(), doc.getScore()));
    }

    public Flux<RetrievedDocument> retrieveWithContext(
            String query,
            String projectId,
            int accessLevel) {

        return retrieveRelevantDocuments(query, projectId, accessLevel)
            .flatMap(doc -> enrichWithRelatedDocuments(doc, projectId))
            .take(topK);
    }

    private Mono<RetrievedDocument> enrichWithRelatedDocuments(
            RetrievedDocument doc,
            String projectId) {

        String cypher = """
            MATCH (d:Document {documentId: $docId})
            OPTIONAL MATCH (d)-[:REFERENCES]->(ref:Document)
            OPTIONAL MATCH (d)<-[:REFERENCES]-(cited:Document)
            RETURN collect(DISTINCT ref.excerpt) as references,
                   collect(DISTINCT cited.excerpt) as citedBy
            """;

        return neo4jClient.query(cypher)
            .bind(doc.getDocumentId()).to("docId")
            .fetchOne()
            .map(record -> {
                List<String> refs = record.get("references").asList(Value::asString);
                List<String> cited = record.get("citedBy").asList(Value::asString);
                doc.setRelatedContext(String.join("\n", refs) + "\n" + String.join("\n", cited));
                return doc;
            })
            .defaultIfEmpty(doc);
    }

    private boolean hasAccess(DocumentNode doc, int accessLevel) {
        // Implement access control logic
        return true;
    }

    private RetrievedDocument toRetrievedDocument(DocumentWithScore docScore) {
        DocumentNode doc = docScore.getNode();
        return RetrievedDocument.builder()
            .documentId(doc.getDocumentId())
            .title(doc.getTitle())
            .type(doc.getType())
            .excerpt(doc.getExcerpt())
            .score(docScore.getScore())
            .build();
    }
}
```

### Acceptance Criteria

- [ ] Neo4j connection pool configured
- [ ] Vector search queries work
- [ ] Graph traversal queries work
- [ ] Access control integrated
- [ ] No blocking operations

---

## Task 4.3: Observability Implementation

### Description

Implement comprehensive observability with metrics, distributed tracing, and structured logging.

### Deliverables

#### 4.3.1 Micrometer Metrics Configuration

```java
// config/MetricsConfig.java
@Configuration
public class MetricsConfig {

    @Bean
    public MeterRegistryCustomizer<MeterRegistry> commonTags() {
        return registry -> registry.config()
            .commonTags("application", "pms-chat-api")
            .commonTags("environment", getEnvironment());
    }

    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    private String getEnvironment() {
        return System.getenv().getOrDefault("ENVIRONMENT", "development");
    }
}
```

#### 4.3.2 Custom Metrics Service

```java
// observability/MetricsService.java
@Component
@RequiredArgsConstructor
public class MetricsService {

    private final MeterRegistry meterRegistry;

    // Stream metrics
    private final Counter streamStarted;
    private final Counter streamCompleted;
    private final Counter streamErrors;
    private final Timer streamDuration;
    private final DistributionSummary tokenCount;

    // Engine metrics
    private final Counter engineRequests;
    private final Timer engineLatency;

    // Tool metrics
    private final Counter toolExecutions;
    private final Timer toolDuration;

    public MetricsService(MeterRegistry registry) {
        this.meterRegistry = registry;

        this.streamStarted = Counter.builder("chat.stream.started")
            .description("Number of chat streams started")
            .register(registry);

        this.streamCompleted = Counter.builder("chat.stream.completed")
            .description("Number of chat streams completed successfully")
            .register(registry);

        this.streamErrors = Counter.builder("chat.stream.errors")
            .description("Number of chat stream errors")
            .register(registry);

        this.streamDuration = Timer.builder("chat.stream.duration")
            .description("Duration of chat streams")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        this.tokenCount = DistributionSummary.builder("chat.tokens")
            .description("Token count distribution")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        this.engineRequests = Counter.builder("llm.engine.requests")
            .description("Requests per engine")
            .register(registry);

        this.engineLatency = Timer.builder("llm.engine.latency")
            .description("Engine response latency")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        this.toolExecutions = Counter.builder("tool.executions")
            .description("Tool executions")
            .register(registry);

        this.toolDuration = Timer.builder("tool.duration")
            .description("Tool execution duration")
            .register(registry);
    }

    public void recordStreamStart(String engine) {
        streamStarted.increment();
        engineRequests.increment(Tags.of("engine", engine));
    }

    public void recordStreamComplete(String engine, long durationMs, int tokens) {
        streamCompleted.increment();
        streamDuration.record(durationMs, TimeUnit.MILLISECONDS);
        tokenCount.record(tokens);
        engineLatency.record(durationMs, TimeUnit.MILLISECONDS,
            Tags.of("engine", engine));
    }

    public void recordStreamError(String engine, String errorType) {
        streamErrors.increment(Tags.of("engine", engine, "error", errorType));
    }

    public void recordToolExecution(String tool, long durationMs, boolean success) {
        toolExecutions.increment(Tags.of("tool", tool, "success", String.valueOf(success)));
        toolDuration.record(durationMs, TimeUnit.MILLISECONDS, Tags.of("tool", tool));
    }

    // Gauge for concurrent streams
    public void registerConcurrentStreams(AtomicInteger counter) {
        Gauge.builder("chat.streams.concurrent", counter, AtomicInteger::get)
            .description("Number of concurrent chat streams")
            .register(meterRegistry);
    }
}
```

#### 4.3.3 Distributed Tracing Configuration

```java
// config/TracingConfig.java
@Configuration
public class TracingConfig {

    @Bean
    public Tracer tracer(MeterRegistry meterRegistry) {
        return Observation.createNotStarted("default", meterRegistry)
            .start()
            .getTracer();
    }

    @Bean
    public ObservationRegistry observationRegistry() {
        return ObservationRegistry.create();
    }

    @Bean
    public WebFilter tracingWebFilter() {
        return (exchange, chain) -> {
            String traceId = exchange.getRequest().getHeaders()
                .getFirst("X-Trace-ID");

            if (traceId == null) {
                traceId = UUID.randomUUID().toString();
            }

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-Trace-ID", traceId)
                .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build())
                .contextWrite(Context.of("traceId", traceId));
        };
    }
}
```

#### 4.3.4 Structured Logging Configuration

```xml
<!-- logback-spring.xml -->
<configuration>
    <springProperty scope="context" name="appName" source="spring.application.name"/>

    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>traceId</includeMdcKeyName>
            <includeMdcKeyName>userId</includeMdcKeyName>
            <includeMdcKeyName>sessionId</includeMdcKeyName>
            <customFields>{"application":"${appName}"}</customFields>
        </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/${appName}.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/${appName}.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>

    <logger name="com.insuretech.pms" level="DEBUG"/>
    <logger name="io.r2dbc" level="WARN"/>
    <logger name="org.neo4j.driver" level="WARN"/>
</configuration>
```

#### 4.3.5 Logging Context Propagation

```java
// observability/LoggingContextFilter.java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LoggingContextFilter implements WebFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String traceId = extractOrGenerateTraceId(exchange);
        String userId = extractUserId(exchange);

        return chain.filter(exchange)
            .contextWrite(ctx -> ctx
                .put("traceId", traceId)
                .put("userId", userId))
            .doFirst(() -> {
                MDC.put("traceId", traceId);
                MDC.put("userId", userId);
            })
            .doFinally(signal -> {
                MDC.remove("traceId");
                MDC.remove("userId");
            });
    }

    private String extractOrGenerateTraceId(ServerWebExchange exchange) {
        String traceId = exchange.getRequest().getHeaders().getFirst("X-Trace-ID");
        return traceId != null ? traceId : UUID.randomUUID().toString();
    }

    private String extractUserId(ServerWebExchange exchange) {
        return exchange.getPrincipal()
            .map(Principal::getName)
            .blockOptional()
            .orElse("anonymous");
    }
}
```

#### 4.3.6 Prometheus Endpoint Configuration

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true
```

### Acceptance Criteria

- [ ] Metrics exposed on /actuator/prometheus
- [ ] Trace ID propagated through all layers
- [ ] Structured JSON logging enabled
- [ ] Custom metrics for streams, tools, engines
- [ ] Dashboards created (Grafana)

---

## Task 4.4: Performance Tuning

### Description

Optimize system performance through configuration tuning, caching, and load testing.

### Deliverables

#### 4.4.1 WebFlux Server Optimization

```yaml
# application.yml
server:
  netty:
    connection-timeout: 10s
    idle-timeout: 60s
    max-keep-alive-requests: 100
  http2:
    enabled: true

spring:
  webflux:
    base-path: /api
  codec:
    max-in-memory-size: 10MB
```

#### 4.4.2 Redis Caching for Sessions

```java
// config/ReactiveCacheConfig.java
@Configuration
@EnableCaching
public class ReactiveCacheConfig {

    @Bean
    public ReactiveRedisConnectionFactory reactiveRedisConnectionFactory(
            @Value("${spring.redis.host}") String host,
            @Value("${spring.redis.port}") int port) {

        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(host, port);
        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
            .commandTimeout(Duration.ofSeconds(5))
            .build();

        return new LettuceConnectionFactory(config, clientConfig);
    }

    @Bean
    public ReactiveRedisTemplate<String, Object> reactiveRedisTemplate(
            ReactiveRedisConnectionFactory factory) {

        StringRedisSerializer keySerializer = new StringRedisSerializer();
        Jackson2JsonRedisSerializer<Object> valueSerializer =
            new Jackson2JsonRedisSerializer<>(Object.class);

        RedisSerializationContext<String, Object> context =
            RedisSerializationContext.<String, Object>newSerializationContext()
                .key(keySerializer)
                .value(valueSerializer)
                .hashKey(keySerializer)
                .hashValue(valueSerializer)
                .build();

        return new ReactiveRedisTemplate<>(factory, context);
    }
}

// service/SessionCacheService.java
@Service
@RequiredArgsConstructor
public class SessionCacheService {

    private final ReactiveRedisTemplate<String, Object> redisTemplate;
    private static final String SESSION_PREFIX = "session:";
    private static final Duration SESSION_TTL = Duration.ofHours(24);

    public Mono<ChatSession> getSession(String sessionId) {
        return redisTemplate.opsForValue()
            .get(SESSION_PREFIX + sessionId)
            .cast(ChatSession.class);
    }

    public Mono<Boolean> cacheSession(ChatSession session) {
        return redisTemplate.opsForValue()
            .set(SESSION_PREFIX + session.getSessionId(), session, SESSION_TTL);
    }

    public Mono<Boolean> invalidateSession(String sessionId) {
        return redisTemplate.delete(SESSION_PREFIX + sessionId)
            .map(count -> count > 0);
    }

    public Mono<Boolean> extendSessionTTL(String sessionId) {
        return redisTemplate.expire(SESSION_PREFIX + sessionId, SESSION_TTL);
    }
}
```

#### 4.4.3 Connection Pool Monitoring

```java
// observability/ConnectionPoolMetrics.java
@Component
@RequiredArgsConstructor
public class ConnectionPoolMetrics {

    private final MeterRegistry meterRegistry;

    @EventListener(ApplicationReadyEvent.class)
    public void registerMetrics(ApplicationReadyEvent event) {
        // R2DBC pool metrics
        ConnectionFactory connectionFactory = event.getApplicationContext()
            .getBean(ConnectionFactory.class);

        if (connectionFactory instanceof ConnectionPool pool) {
            Gauge.builder("r2dbc.pool.acquired", pool, p -> p.getMetrics().acquiredSize())
                .register(meterRegistry);

            Gauge.builder("r2dbc.pool.allocated", pool, p -> p.getMetrics().allocatedSize())
                .register(meterRegistry);

            Gauge.builder("r2dbc.pool.pending", pool, p -> p.getMetrics().pendingAcquireSize())
                .register(meterRegistry);
        }
    }
}
```

#### 4.4.4 Load Testing Script

```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const ttft = new Trend('time_to_first_token');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up
    { duration: '5m', target: 50 },   // Sustained load
    { duration: '2m', target: 100 },  // Peak load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.1'],             // Error rate < 10%
    http_req_duration: ['p(95)<5000'], // 95% under 5s
    time_to_first_token: ['p(95)<3000'], // TTFT 95% under 3s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8083';

export default function () {
  const payload = JSON.stringify({
    message: 'What is the status of project P001?',
    engine: 'auto',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TOKEN}`,
    },
  };

  const startTime = Date.now();
  let firstTokenTime = null;

  const res = http.post(`${BASE_URL}/api/v2/chat/stream`, payload, params);

  // Parse SSE response
  const lines = res.body.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:') && firstTokenTime === null) {
      firstTokenTime = Date.now();
      ttft.add(firstTokenTime - startTime);
    }
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has meta event': (r) => r.body.includes('event: meta'),
    'has done event': (r) => r.body.includes('event: done'),
  });

  errorRate.add(res.status !== 200);

  sleep(1);
}
```

#### 4.4.5 Performance Tuning Checklist

```yaml
# Performance tuning documentation
performance:
  chat-api:
    connection-pool:
      r2dbc:
        min: 5
        max: 20
        validation: "SELECT 1"
      neo4j:
        max: 50
        acquisition-timeout: 30s
      redis:
        min: 2
        max: 10

    webflux:
      max-concurrent-streams: 1000
      buffer-size: 256KB

  gateway:
    timeout:
      ttft: 10s
      total: 90s
    circuit-breaker:
      failure-threshold: 50%
      wait-duration: 30s
    concurrency:
      gguf: 2
      vllm: 20

  workers:
    gguf:
      ctx-size: 8192
      gpu-layers: 35
      parallel: 2
    vllm:
      max-model-len: 32768
      gpu-memory-utilization: 0.9
```

### Acceptance Criteria

- [ ] Connection pools sized appropriately
- [ ] Redis caching reduces DB load
- [ ] Load tests pass thresholds
- [ ] TTFT p95 < 3 seconds
- [ ] Error rate < 10% under load

---

## Task 4.5: Production Hardening

### Description

Final production preparation including security, health checks, and deployment configuration.

### Deliverables

#### 4.5.1 Security Configuration

```java
// config/ReactiveSecurityConfig.java
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class ReactiveSecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/actuator/health/**").permitAll()
                .pathMatchers("/actuator/prometheus").permitAll()
                .pathMatchers("/api/v2/chat/**").authenticated()
                .pathMatchers("/api/v2/ab/**").hasRole("ADMIN")
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "http://localhost:5173",
            "https://pms.insuretech.com"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private Converter<Jwt, Mono<AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        return jwt -> {
            Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
            return Mono.just(new JwtAuthenticationToken(jwt, authorities));
        };
    }
}
```

#### 4.5.2 Health Indicators

```java
// health/LlmGatewayHealthIndicator.java
@Component
public class LlmGatewayHealthIndicator implements ReactiveHealthIndicator {

    private final WebClient webClient;

    @Value("${llm.gateway.url}")
    private String gatewayUrl;

    public LlmGatewayHealthIndicator(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    @Override
    public Mono<Health> health() {
        return webClient.get()
            .uri(gatewayUrl + "/health")
            .retrieve()
            .bodyToMono(String.class)
            .timeout(Duration.ofSeconds(5))
            .map(response -> Health.up()
                .withDetail("gateway", "available")
                .build())
            .onErrorResume(e -> Mono.just(Health.down()
                .withDetail("gateway", "unavailable")
                .withDetail("error", e.getMessage())
                .build()));
    }
}

// health/DatabaseHealthIndicator.java
@Component
public class DatabaseHealthIndicator implements ReactiveHealthIndicator {

    private final R2dbcEntityOperations r2dbcOperations;

    public DatabaseHealthIndicator(R2dbcEntityOperations operations) {
        this.r2dbcOperations = operations;
    }

    @Override
    public Mono<Health> health() {
        return r2dbcOperations.getDatabaseClient()
            .sql("SELECT 1")
            .fetch()
            .first()
            .timeout(Duration.ofSeconds(5))
            .map(result -> Health.up()
                .withDetail("database", "available")
                .build())
            .onErrorResume(e -> Mono.just(Health.down()
                .withDetail("database", "unavailable")
                .withDetail("error", e.getMessage())
                .build()));
    }
}
```

#### 4.5.3 Kubernetes Deployment

```yaml
# k8s/chat-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-api
  labels:
    app: chat-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chat-api
  template:
    metadata:
      labels:
        app: chat-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8083"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      containers:
        - name: chat-api
          image: pms/chat-api:latest
          ports:
            - containerPort: 8083
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "production"
            - name: LLM_GATEWAY_URL
              value: "http://llm-gateway:8080"
          envFrom:
            - secretRef:
                name: chat-api-secrets
            - configMapRef:
                name: chat-api-config
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8083
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8083
            initialDelaySeconds: 60
            periodSeconds: 30
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: chat-api
spec:
  selector:
    app: chat-api
  ports:
    - port: 8083
      targetPort: 8083
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chat-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chat-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: chat_streams_concurrent
        target:
          type: AverageValue
          averageValue: "50"
```

#### 4.5.4 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "PMS Chat API",
    "panels": [
      {
        "title": "Active Streams",
        "type": "gauge",
        "targets": [{
          "expr": "chat_streams_concurrent"
        }]
      },
      {
        "title": "Stream Duration (p95)",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(chat_stream_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Engine Distribution",
        "type": "piechart",
        "targets": [{
          "expr": "sum by (engine) (rate(llm_engine_requests_total[5m]))"
        }]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [{
          "expr": "rate(chat_stream_errors_total[5m])"
        }]
      },
      {
        "title": "Tool Execution Time",
        "type": "heatmap",
        "targets": [{
          "expr": "rate(tool_duration_seconds_bucket[5m])"
        }]
      }
    ]
  }
}
```

### Acceptance Criteria

- [ ] Security configuration complete
- [ ] Health endpoints working
- [ ] Kubernetes manifests ready
- [ ] Grafana dashboards created
- [ ] Runbooks documented

---

## Definition of Done

### Code Complete

- [ ] R2DBC migration complete
- [ ] Reactive Neo4j integrated
- [ ] Observability implemented
- [ ] Performance tuning applied
- [ ] Production hardening complete

### Testing

- [ ] All tests passing
- [ ] Load tests pass thresholds
- [ ] Security scan clean

### Documentation

- [ ] Architecture diagrams updated
- [ ] Runbooks created
- [ ] Monitoring guides written

### Deployment

- [ ] Kubernetes manifests validated
- [ ] CI/CD pipeline updated
- [ ] Staging deployment successful

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| 4.1 R2DBC Full Migration | 4 days |
| 4.2 Reactive Neo4j Integration | 3 days |
| 4.3 Observability Implementation | 3 days |
| 4.4 Performance Tuning | 3 days |
| 4.5 Production Hardening | 3 days |
| Testing & Validation | 2 days |
| **Total** | **18 days** |

---

## Total Project Summary

| Phase | Focus | Duration |
|-------|-------|----------|
| Phase 1 | Foundation (SSE, WebFlux, Gateway) | 12 days |
| Phase 2 | Engine Integration (GGUF, Routing) | 10 days |
| Phase 3 | Advanced Features (Tools, A/B) | 14 days |
| Phase 4 | Optimization (R2DBC, Observability) | 18 days |
| **Total** | | **54 days** |

---

*Phase 4 Document Version: 1.0*
*Last Updated: 2026-01-29*
