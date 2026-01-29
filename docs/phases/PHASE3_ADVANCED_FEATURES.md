# Phase 3: Advanced Features

## Tool Calling & A/B Testing

---

## Overview

| Attribute | Value |
|-----------|-------|
| Phase | 3 of 4 |
| Focus | Tool calling orchestration, A/B testing infrastructure |
| Dependencies | Phase 1 & 2 completed |
| Deliverables | Working tool calling, A/B comparison capability |

---

## Objectives

1. Implement tool calling orchestration in Chat API
2. Define and register domain-specific tools
3. Implement A/B testing mode in Gateway
4. Build A/B comparison data collection
5. Create A/B comparison dashboard

---

## Task 3.1: Tool Calling Orchestration

### Description

Implement the multi-turn tool calling loop in Chat API that detects tool calls from LLM, executes them, and continues the conversation.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Tool Calling Flow                                   │
└─────────────────────────────────────────────────────────────────────────┘

User Message
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Chat API: Build messages + tools definition                             │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Gateway: Stream to LLM                                                  │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LLM Response (streaming)                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  delta(text): "I'll check the project status..."                  │  │
│  │  delta(tool_call): {name: "getProjectStatus", args: {...}}        │  │
│  │  done: {finish_reason: "tool_calls"}                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Chat API: Detect tool_call → Execute Tool                               │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ToolExecutor.execute("getProjectStatus", {projectId: "p1"})      │  │
│  │  → Returns: {status: "In Progress", completion: 75}               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Chat API: Append tool result → Continue stream                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  messages += {role: "assistant", tool_calls: [...]}               │  │
│  │  messages += {role: "tool", content: "{...}", tool_call_id: "x"}  │  │
│  │  → New LLM request with updated messages                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LLM Response (final)                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  delta(text): "The project is 75% complete..."                    │  │
│  │  done: {finish_reason: "stop"}                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
User sees complete response
```

### Deliverables

#### 3.1.1 Tool Definitions

```java
// domain/ToolDefinition.java
@Data
@Builder
public class ToolDefinition {
    private String name;
    private String description;
    private JsonSchema parameters;
    private ToolCategory category;
    private List<String> requiredRoles;  // RBAC

    public enum ToolCategory {
        PROJECT_MANAGEMENT,
        DOCUMENT_ANALYSIS,
        DATA_QUERY,
        UTILITY
    }
}

// domain/ToolCall.java
@Data
@Builder
public class ToolCall {
    private String id;
    private String name;
    private String arguments;  // JSON string
    private Instant timestamp;
}

// domain/ToolResult.java
@Data
@Builder
public class ToolResult {
    private String toolCallId;
    private String name;
    private String content;  // JSON string or text
    private boolean success;
    private String error;
    private long executionTimeMs;
}
```

#### 3.1.2 Tool Registry

```java
// application/ToolRegistry.java
@Component
@Slf4j
public class ToolRegistry {

    private final Map<String, ToolHandler> handlers = new ConcurrentHashMap<>();
    private final Map<String, ToolDefinition> definitions = new ConcurrentHashMap<>();

    public ToolRegistry(List<ToolHandler> toolHandlers) {
        for (ToolHandler handler : toolHandlers) {
            register(handler);
        }
        log.info("Registered {} tools", handlers.size());
    }

    public void register(ToolHandler handler) {
        ToolDefinition def = handler.getDefinition();
        handlers.put(def.getName(), handler);
        definitions.put(def.getName(), def);
        log.debug("Registered tool: {}", def.getName());
    }

    public Optional<ToolHandler> getHandler(String name) {
        return Optional.ofNullable(handlers.get(name));
    }

    public List<ToolDefinition> getAllDefinitions() {
        return new ArrayList<>(definitions.values());
    }

    public List<ToolDefinition> getDefinitionsForUser(UserDetails user) {
        return definitions.values().stream()
            .filter(def -> hasAccess(user, def))
            .toList();
    }

    private boolean hasAccess(UserDetails user, ToolDefinition def) {
        if (def.getRequiredRoles() == null || def.getRequiredRoles().isEmpty()) {
            return true;
        }
        return user.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(def.getRequiredRoles()::contains);
    }

    public JsonNode toOpenAiFormat(List<ToolDefinition> tools) {
        ArrayNode array = objectMapper.createArrayNode();
        for (ToolDefinition tool : tools) {
            ObjectNode toolNode = objectMapper.createObjectNode();
            toolNode.put("type", "function");

            ObjectNode functionNode = objectMapper.createObjectNode();
            functionNode.put("name", tool.getName());
            functionNode.put("description", tool.getDescription());
            functionNode.set("parameters", tool.getParameters().toJsonNode());

            toolNode.set("function", functionNode);
            array.add(toolNode);
        }
        return array;
    }
}
```

#### 3.1.3 Tool Handler Interface

```java
// application/ToolHandler.java
public interface ToolHandler {

    ToolDefinition getDefinition();

    Mono<ToolResult> execute(ToolCall call, ToolContext context);

    default boolean validate(String arguments) {
        return true;  // Override for custom validation
    }
}

// application/ToolContext.java
@Data
@Builder
public class ToolContext {
    private String userId;
    private String projectId;
    private String sessionId;
    private String traceId;
    private List<String> userRoles;
    private int accessLevel;
}
```

#### 3.1.4 Tool Executor Service

```java
// application/ToolExecutor.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ToolExecutor {

    private final ToolRegistry registry;
    private final MeterRegistry meterRegistry;

    @Value("${tools.execution.timeout:30s}")
    private Duration executionTimeout;

    @Value("${tools.execution.max-parallel:3}")
    private int maxParallel;

    public Mono<ToolResult> execute(ToolCall call, ToolContext context) {
        String toolName = call.getName();
        Instant start = Instant.now();

        log.info("Executing tool: {} for trace: {}", toolName, context.getTraceId());

        return registry.getHandler(toolName)
            .map(handler -> executeWithTimeout(handler, call, context, start))
            .orElseGet(() -> Mono.just(ToolResult.builder()
                .toolCallId(call.getId())
                .name(toolName)
                .success(false)
                .error("Unknown tool: " + toolName)
                .build()));
    }

    private Mono<ToolResult> executeWithTimeout(
            ToolHandler handler,
            ToolCall call,
            ToolContext context,
            Instant start) {

        return handler.execute(call, context)
            .timeout(executionTimeout)
            .doOnSuccess(result -> {
                long duration = Duration.between(start, Instant.now()).toMillis();
                result.setExecutionTimeMs(duration);
                recordSuccess(call.getName(), duration);
                log.info("Tool {} completed in {}ms", call.getName(), duration);
            })
            .onErrorResume(e -> {
                long duration = Duration.between(start, Instant.now()).toMillis();
                recordError(call.getName());
                log.error("Tool {} failed after {}ms: {}",
                    call.getName(), duration, e.getMessage());

                return Mono.just(ToolResult.builder()
                    .toolCallId(call.getId())
                    .name(call.getName())
                    .success(false)
                    .error(e.getMessage())
                    .executionTimeMs(duration)
                    .build());
            });
    }

    public Flux<ToolResult> executeParallel(List<ToolCall> calls, ToolContext context) {
        return Flux.fromIterable(calls)
            .flatMap(call -> execute(call, context), maxParallel);
    }

    private void recordSuccess(String tool, long durationMs) {
        meterRegistry.counter("tool.execution", "tool", tool, "status", "success").increment();
        meterRegistry.timer("tool.duration", "tool", tool).record(durationMs, TimeUnit.MILLISECONDS);
    }

    private void recordError(String tool) {
        meterRegistry.counter("tool.execution", "tool", tool, "status", "error").increment();
    }
}
```

#### 3.1.5 Tool Calling Orchestration in Chat Service

```java
// application/ReactiveChatStreamService.java (enhanced)
@Service
@RequiredArgsConstructor
@Slf4j
public class ReactiveChatStreamService {

    private final LlmGatewayClient gatewayClient;
    private final ReactiveChatSessionService sessionService;
    private final ToolRegistry toolRegistry;
    private final ToolExecutor toolExecutor;
    private final SseEventBuilder sseBuilder;

    @Value("${tools.max-iterations:5}")
    private int maxToolIterations;

    public Flux<ServerSentEvent<String>> streamMessage(
            ChatStreamRequest request,
            UserDetails user,
            String traceId) {

        ToolContext toolContext = buildToolContext(request, user, traceId);
        List<ToolDefinition> availableTools = toolRegistry.getDefinitionsForUser(user);

        return sessionService.ensureSession(request.getSessionId(), user.getUsername())
            .flatMapMany(sessionId -> {
                // Save user message
                Mono<Void> saveUser = sessionService
                    .saveMessage(sessionId, "user", request.getMessage());

                // Initial messages
                List<ChatMessage> messages = buildMessages(request);

                // Start tool loop
                return saveUser.thenMany(
                    runToolLoop(messages, availableTools, toolContext, sessionId, 0)
                );
            });
    }

    private Flux<ServerSentEvent<String>> runToolLoop(
            List<ChatMessage> messages,
            List<ToolDefinition> tools,
            ToolContext context,
            String sessionId,
            int iteration) {

        if (iteration >= maxToolIterations) {
            log.warn("Max tool iterations reached: {}", context.getTraceId());
            return Flux.just(sseBuilder.error(ErrorEvent.builder()
                .code("MAX_ITERATIONS")
                .message("Maximum tool iterations exceeded")
                .build()));
        }

        // Build gateway request
        GatewayRequest gatewayRequest = GatewayRequest.builder()
            .traceId(context.getTraceId())
            .engine("auto")
            .stream(true)
            .messages(messages)
            .tools(toolRegistry.toOpenAiFormat(tools))
            .build();

        // Collect stream and process
        return collectStreamWithToolDetection(gatewayRequest)
            .flatMapMany(turnResult -> {
                // Emit text events to user
                Flux<ServerSentEvent<String>> textEvents = Flux.fromIterable(turnResult.getTextEvents());

                if (turnResult.hasToolCalls()) {
                    // Execute tools
                    Flux<ServerSentEvent<String>> toolExecution =
                        executeToolsAndContinue(
                            messages,
                            turnResult.getToolCalls(),
                            turnResult.getAssistantMessage(),
                            tools,
                            context,
                            sessionId,
                            iteration + 1
                        );

                    return Flux.concat(textEvents, toolExecution);
                } else {
                    // No tools, stream is complete
                    return textEvents.concatWith(
                        saveAndComplete(sessionId, turnResult.getFullText())
                    );
                }
            });
    }

    private Mono<TurnResult> collectStreamWithToolDetection(GatewayRequest request) {
        return gatewayClient.streamChat(request)
            .reduce(new TurnResult(), (result, event) -> {
                String eventType = event.event();
                String data = event.data();

                if ("delta".equals(eventType)) {
                    DeltaEvent delta = parseData(data, DeltaEvent.class);

                    if (delta.getKind() == DeltaKind.TEXT) {
                        result.appendText(delta.getText());
                        result.addTextEvent(event);
                    } else if (delta.getKind() == DeltaKind.TOOL_CALL) {
                        result.addToolCall(delta.getToolCall());
                    } else if (delta.getKind() == DeltaKind.TOOL_CALL_DELTA) {
                        result.appendToolCallDelta(delta.getToolCall());
                    }
                } else if ("done".equals(eventType)) {
                    result.setComplete(true);
                }

                return result;
            });
    }

    private Flux<ServerSentEvent<String>> executeToolsAndContinue(
            List<ChatMessage> originalMessages,
            List<ToolCall> toolCalls,
            ChatMessage assistantMessage,
            List<ToolDefinition> tools,
            ToolContext context,
            String sessionId,
            int nextIteration) {

        log.info("Executing {} tools for trace: {}", toolCalls.size(), context.getTraceId());

        return toolExecutor.executeParallel(toolCalls, context)
            .collectList()
            .flatMapMany(results -> {
                // Build updated messages
                List<ChatMessage> updatedMessages = new ArrayList<>(originalMessages);

                // Add assistant message with tool calls
                updatedMessages.add(assistantMessage);

                // Add tool results
                for (ToolResult result : results) {
                    updatedMessages.add(ChatMessage.builder()
                        .role("tool")
                        .toolCallId(result.getToolCallId())
                        .name(result.getName())
                        .content(result.getContent())
                        .build());
                }

                // Continue the loop
                return runToolLoop(updatedMessages, tools, context, sessionId, nextIteration);
            });
    }

    private Flux<ServerSentEvent<String>> saveAndComplete(String sessionId, String fullText) {
        return sessionService.saveMessage(sessionId, "assistant", fullText)
            .thenMany(Flux.just(sseBuilder.done(DoneEvent.builder()
                .finishReason("stop")
                .build())));
    }

    // TurnResult helper class
    @Data
    private static class TurnResult {
        private StringBuilder textBuffer = new StringBuilder();
        private List<ServerSentEvent<String>> textEvents = new ArrayList<>();
        private List<ToolCall> toolCalls = new ArrayList<>();
        private Map<String, StringBuilder> toolCallDeltas = new HashMap<>();
        private boolean complete = false;

        public void appendText(String text) {
            textBuffer.append(text);
        }

        public String getFullText() {
            return textBuffer.toString();
        }

        public void addTextEvent(ServerSentEvent<String> event) {
            textEvents.add(event);
        }

        public void addToolCall(ToolCall call) {
            toolCalls.add(call);
        }

        public void appendToolCallDelta(ToolCall delta) {
            // Accumulate partial tool call arguments
            toolCallDeltas.computeIfAbsent(delta.getId(), k -> new StringBuilder())
                .append(delta.getArguments());
        }

        public boolean hasToolCalls() {
            return !toolCalls.isEmpty();
        }

        public ChatMessage getAssistantMessage() {
            return ChatMessage.builder()
                .role("assistant")
                .content(textBuffer.toString())
                .toolCalls(toolCalls)
                .build();
        }
    }
}
```

### Acceptance Criteria

- [ ] Tool definitions registered at startup
- [ ] Tools filtered by user roles
- [ ] Tool calls detected in stream
- [ ] Tools executed with timeout
- [ ] Results appended to conversation
- [ ] Multi-iteration loops work (tool -> result -> tool -> result -> text)

---

## Task 3.2: Domain Tool Implementations

### Description

Implement project management domain-specific tools.

### Deliverables

#### 3.2.1 Project Status Tool

```java
// tools/GetProjectStatusTool.java
@Component
@RequiredArgsConstructor
@Slf4j
public class GetProjectStatusTool implements ToolHandler {

    private final ReactiveProjectRepository projectRepository;
    private final ObjectMapper objectMapper;

    @Override
    public ToolDefinition getDefinition() {
        return ToolDefinition.builder()
            .name("getProjectStatus")
            .description("Get the current status and progress of a project")
            .parameters(JsonSchema.builder()
                .type("object")
                .properties(Map.of(
                    "projectId", JsonSchema.builder()
                        .type("string")
                        .description("The project ID")
                        .build()
                ))
                .required(List.of("projectId"))
                .build())
            .category(ToolCategory.PROJECT_MANAGEMENT)
            .requiredRoles(List.of("PM", "PMO_HEAD", "SPONSOR", "DEVELOPER"))
            .build();
    }

    @Override
    public Mono<ToolResult> execute(ToolCall call, ToolContext context) {
        try {
            JsonNode args = objectMapper.readTree(call.getArguments());
            String projectId = args.get("projectId").asText();

            return projectRepository.findById(projectId)
                .map(project -> {
                    Map<String, Object> result = Map.of(
                        "projectId", project.getId(),
                        "name", project.getName(),
                        "status", project.getStatus().name(),
                        "completion", project.getCompletionPercentage(),
                        "startDate", project.getStartDate().toString(),
                        "endDate", project.getEndDate() != null ?
                            project.getEndDate().toString() : "Not set",
                        "currentPhase", project.getCurrentPhase() != null ?
                            project.getCurrentPhase().getName() : "Not started"
                    );

                    return ToolResult.builder()
                        .toolCallId(call.getId())
                        .name(call.getName())
                        .content(toJson(result))
                        .success(true)
                        .build();
                })
                .switchIfEmpty(Mono.just(ToolResult.builder()
                    .toolCallId(call.getId())
                    .name(call.getName())
                    .success(false)
                    .error("Project not found: " + projectId)
                    .build()));

        } catch (Exception e) {
            return Mono.just(ToolResult.builder()
                .toolCallId(call.getId())
                .name(call.getName())
                .success(false)
                .error("Invalid arguments: " + e.getMessage())
                .build());
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
```

#### 3.2.2 Task Query Tool

```java
// tools/QueryTasksTool.java
@Component
@RequiredArgsConstructor
public class QueryTasksTool implements ToolHandler {

    private final ReactiveTaskRepository taskRepository;
    private final ObjectMapper objectMapper;

    @Override
    public ToolDefinition getDefinition() {
        return ToolDefinition.builder()
            .name("queryTasks")
            .description("Query tasks by project, status, or assignee")
            .parameters(JsonSchema.builder()
                .type("object")
                .properties(Map.of(
                    "projectId", JsonSchema.builder()
                        .type("string")
                        .description("Filter by project ID")
                        .build(),
                    "status", JsonSchema.builder()
                        .type("string")
                        .enumValues(List.of("TODO", "IN_PROGRESS", "DONE", "BLOCKED"))
                        .description("Filter by status")
                        .build(),
                    "assigneeId", JsonSchema.builder()
                        .type("string")
                        .description("Filter by assignee user ID")
                        .build(),
                    "limit", JsonSchema.builder()
                        .type("integer")
                        .description("Maximum number of results (default 10)")
                        .build()
                ))
                .build())
            .category(ToolCategory.PROJECT_MANAGEMENT)
            .build();
    }

    @Override
    public Mono<ToolResult> execute(ToolCall call, ToolContext context) {
        try {
            JsonNode args = objectMapper.readTree(call.getArguments());

            String projectId = getStringOrNull(args, "projectId");
            String status = getStringOrNull(args, "status");
            String assigneeId = getStringOrNull(args, "assigneeId");
            int limit = args.has("limit") ? args.get("limit").asInt() : 10;

            return taskRepository.findByFilters(projectId, status, assigneeId)
                .take(limit)
                .map(task -> Map.of(
                    "id", task.getId(),
                    "title", task.getTitle(),
                    "status", task.getStatus().name(),
                    "assignee", task.getAssignee() != null ?
                        task.getAssignee().getUsername() : "Unassigned",
                    "dueDate", task.getDueDate() != null ?
                        task.getDueDate().toString() : "No due date"
                ))
                .collectList()
                .map(tasks -> ToolResult.builder()
                    .toolCallId(call.getId())
                    .name(call.getName())
                    .content(toJson(Map.of("tasks", tasks, "count", tasks.size())))
                    .success(true)
                    .build());

        } catch (Exception e) {
            return Mono.just(errorResult(call, e.getMessage()));
        }
    }
}
```

#### 3.2.3 Document Search Tool

```java
// tools/SearchDocumentsTool.java
@Component
@RequiredArgsConstructor
public class SearchDocumentsTool implements ToolHandler {

    private final ReactiveNeo4jClient neo4jClient;
    private final ObjectMapper objectMapper;

    @Override
    public ToolDefinition getDefinition() {
        return ToolDefinition.builder()
            .name("searchDocuments")
            .description("Search project documents using semantic search")
            .parameters(JsonSchema.builder()
                .type("object")
                .properties(Map.of(
                    "query", JsonSchema.builder()
                        .type("string")
                        .description("Search query")
                        .build(),
                    "projectId", JsonSchema.builder()
                        .type("string")
                        .description("Limit search to specific project")
                        .build(),
                    "documentType", JsonSchema.builder()
                        .type("string")
                        .enumValues(List.of("CHARTER", "PLAN", "REPORT", "REQUIREMENT"))
                        .description("Filter by document type")
                        .build(),
                    "limit", JsonSchema.builder()
                        .type("integer")
                        .description("Maximum results (default 5)")
                        .build()
                ))
                .required(List.of("query"))
                .build())
            .category(ToolCategory.DOCUMENT_ANALYSIS)
            .build();
    }

    @Override
    public Mono<ToolResult> execute(ToolCall call, ToolContext context) {
        try {
            JsonNode args = objectMapper.readTree(call.getArguments());
            String query = args.get("query").asText();
            String projectId = getStringOrNull(args, "projectId");
            int limit = args.has("limit") ? args.get("limit").asInt() : 5;

            String cypher = """
                CALL db.index.vector.queryNodes('document_embeddings', $limit, $queryVector)
                YIELD node, score
                WHERE ($projectId IS NULL OR node.projectId = $projectId)
                RETURN node.id AS id,
                       node.title AS title,
                       node.type AS type,
                       node.excerpt AS excerpt,
                       score
                ORDER BY score DESC
                """;

            return neo4jClient.query(cypher)
                .bind(limit).to("limit")
                .bind(projectId).to("projectId")
                .bind(getEmbedding(query)).to("queryVector")
                .fetchAll()
                .map(record -> Map.of(
                    "id", record.get("id").asString(),
                    "title", record.get("title").asString(),
                    "type", record.get("type").asString(),
                    "excerpt", record.get("excerpt").asString(),
                    "relevance", record.get("score").asDouble()
                ))
                .collectList()
                .map(docs -> ToolResult.builder()
                    .toolCallId(call.getId())
                    .name(call.getName())
                    .content(toJson(Map.of("documents", docs)))
                    .success(true)
                    .build());

        } catch (Exception e) {
            return Mono.just(errorResult(call, e.getMessage()));
        }
    }
}
```

### Acceptance Criteria

- [ ] Project status tool returns accurate data
- [ ] Task query tool filters correctly
- [ ] Document search integrates with Neo4j
- [ ] All tools have proper error handling
- [ ] RBAC enforced on tool access

---

## Task 3.3: A/B Testing Mode Implementation

### Description

Implement A/B testing mode in Gateway that streams primary engine response to user while collecting shadow engine response in background.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        A/B Mode Flow                                     │
└─────────────────────────────────────────────────────────────────────────┘

Request: engine=ab
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Gateway: A/B Router                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Primary: vLLM (streamed to user)                                  │  │
│  │  Shadow:  GGUF (collected in background)                           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
           │                                │
           ▼                                ▼
    ┌──────────────┐                 ┌──────────────┐
    │  vLLM Worker │                 │  GGUF Worker │
    │  (streaming) │                 │  (complete)  │
    └──────────────┘                 └──────────────┘
           │                                │
           ▼                                ▼
    User sees vLLM              ABComparisonService.save()
    response                    (background)
```

### Deliverables

#### 3.3.1 A/B Configuration

```yaml
# application.yml
ab-testing:
  enabled: true
  default-primary: vllm
  default-shadow: gguf
  shadow-timeout: 120s
  collection:
    enabled: true
    storage: database  # database | file | kafka
  sampling:
    rate: 1.0  # 100% of AB requests
```

#### 3.3.2 A/B Handler

```java
// handler/ABStreamHandler.java
@Component
@RequiredArgsConstructor
@Slf4j
public class ABStreamHandler {

    private final LlmStreamHandler primaryHandler;
    private final ABComparisonService comparisonService;
    private final WebClient webClient;
    private final EngineRouter engineRouter;

    @Value("${ab-testing.shadow-timeout:120s}")
    private Duration shadowTimeout;

    public Flux<ServerSentEvent<String>> handleABStream(GatewayRequest request) {
        String traceId = request.getTraceId();
        ABConfig abConfig = request.getAb() != null ? request.getAb() : ABConfig.defaults();

        String primaryEngine = abConfig.getPrimary();
        String shadowEngine = abConfig.getShadow();

        log.info("A/B test: traceId={}, primary={}, shadow={}",
            traceId, primaryEngine, shadowEngine);

        // Start shadow collection in background
        if (abConfig.isShadowCollect()) {
            collectShadowInBackground(request, shadowEngine, traceId);
        }

        // Stream primary to user
        GatewayRequest primaryRequest = request.toBuilder()
            .engine(primaryEngine)
            .build();

        return primaryHandler.handleStream(primaryRequest)
            .doOnNext(event -> {
                // Collect primary output for comparison
                comparisonService.appendPrimaryEvent(traceId, event);
            })
            .doOnComplete(() -> {
                comparisonService.markPrimaryComplete(traceId);
            });
    }

    private void collectShadowInBackground(
            GatewayRequest request,
            String shadowEngine,
            String traceId) {

        String shadowUrl = engineRouter.getWorkerUrl(shadowEngine);
        WorkerRequest workerRequest = buildWorkerRequest(request, shadowEngine);

        Instant start = Instant.now();

        // Non-blocking background collection
        webClient.post()
            .uri(shadowUrl + "/v1/chat/completions")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(workerRequest.toBuilder().stream(false).build()) // Non-streaming
            .retrieve()
            .bodyToMono(String.class)
            .timeout(shadowTimeout)
            .subscribe(
                response -> {
                    long duration = Duration.between(start, Instant.now()).toMillis();
                    comparisonService.saveShadowResult(traceId, shadowEngine, response, duration);
                    log.debug("Shadow complete: traceId={}, engine={}, duration={}ms",
                        traceId, shadowEngine, duration);
                },
                error -> {
                    log.warn("Shadow failed: traceId={}, engine={}, error={}",
                        traceId, shadowEngine, error.getMessage());
                    comparisonService.saveShadowError(traceId, shadowEngine, error.getMessage());
                }
            );
    }
}
```

#### 3.3.3 A/B Comparison Service

```java
// service/ABComparisonService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ABComparisonService {

    private final ABComparisonRepository repository;
    private final Map<String, ABComparisonBuilder> inProgress = new ConcurrentHashMap<>();

    public void initComparison(String traceId, GatewayRequest request) {
        ABComparisonBuilder builder = ABComparisonBuilder.builder()
            .traceId(traceId)
            .timestamp(Instant.now())
            .inputMessage(extractUserMessage(request))
            .inputLength(estimateInputLength(request))
            .build();

        inProgress.put(traceId, builder);
    }

    public void appendPrimaryEvent(String traceId, ServerSentEvent<String> event) {
        ABComparisonBuilder builder = inProgress.get(traceId);
        if (builder == null) return;

        if ("delta".equals(event.event())) {
            try {
                DeltaEvent delta = parseData(event.data(), DeltaEvent.class);
                if (delta.getKind() == DeltaKind.TEXT) {
                    builder.appendPrimaryText(delta.getText());
                }
            } catch (Exception ignored) {}
        }
    }

    public void markPrimaryComplete(String traceId) {
        ABComparisonBuilder builder = inProgress.get(traceId);
        if (builder == null) return;

        builder.setPrimaryComplete(true);
        builder.setPrimaryDuration(
            Duration.between(builder.getTimestamp(), Instant.now()).toMillis()
        );

        checkAndSave(traceId);
    }

    public void saveShadowResult(
            String traceId,
            String engine,
            String response,
            long durationMs) {

        ABComparisonBuilder builder = inProgress.get(traceId);
        if (builder == null) return;

        // Parse OpenAI response
        String content = extractContent(response);

        builder.setShadowEngine(engine);
        builder.setShadowText(content);
        builder.setShadowDuration(durationMs);
        builder.setShadowComplete(true);

        checkAndSave(traceId);
    }

    public void saveShadowError(String traceId, String engine, String error) {
        ABComparisonBuilder builder = inProgress.get(traceId);
        if (builder == null) return;

        builder.setShadowEngine(engine);
        builder.setShadowError(error);
        builder.setShadowComplete(true);

        checkAndSave(traceId);
    }

    private void checkAndSave(String traceId) {
        ABComparisonBuilder builder = inProgress.get(traceId);
        if (builder == null) return;

        if (builder.isPrimaryComplete() && builder.isShadowComplete()) {
            // Both complete, save comparison
            ABComparison comparison = builder.build();
            repository.save(comparison).subscribe(
                saved -> {
                    log.info("A/B comparison saved: traceId={}", traceId);
                    inProgress.remove(traceId);
                },
                error -> {
                    log.error("Failed to save A/B comparison: traceId={}", traceId, error);
                    inProgress.remove(traceId);
                }
            );
        }
    }
}
```

#### 3.3.4 A/B Comparison Entity

```java
// domain/ABComparison.java
@Data
@Builder
@Table("ab_comparisons")
public class ABComparison {
    @Id
    private Long id;

    private String traceId;
    private Instant timestamp;

    // Input
    private String inputMessage;
    private Integer inputLength;

    // Primary (shown to user)
    private String primaryEngine;
    private String primaryText;
    private Long primaryDuration;  // ms
    private Long primaryTtft;      // time to first token

    // Shadow (background)
    private String shadowEngine;
    private String shadowText;
    private Long shadowDuration;
    private String shadowError;

    // Computed metrics (can be populated later)
    private Double textSimilarity;
    private Integer primaryTokens;
    private Integer shadowTokens;
}

// repository/ABComparisonRepository.java
public interface ABComparisonRepository extends ReactiveCrudRepository<ABComparison, Long> {

    Flux<ABComparison> findByTimestampBetween(Instant start, Instant end);

    @Query("SELECT * FROM ab_comparisons WHERE primary_engine = :engine ORDER BY timestamp DESC LIMIT :limit")
    Flux<ABComparison> findRecentByPrimaryEngine(String engine, int limit);

    @Query("""
        SELECT primary_engine,
               AVG(primary_duration) as avg_primary_duration,
               AVG(shadow_duration) as avg_shadow_duration,
               COUNT(*) as count
        FROM ab_comparisons
        WHERE timestamp > :since
        GROUP BY primary_engine
        """)
    Flux<ABSummary> getAggregatedStats(Instant since);
}
```

### Acceptance Criteria

- [ ] A/B mode streams primary engine to user
- [ ] Shadow engine runs in background
- [ ] Both results saved for comparison
- [ ] Timeout handling for shadow
- [ ] Metrics recorded for both engines

---

## Task 3.4: A/B Comparison Dashboard

### Description

Build a simple dashboard for viewing and analyzing A/B test results.

### Deliverables

#### 3.4.1 A/B API Endpoints

```java
// controller/ABComparisonController.java
@RestController
@RequestMapping("/api/v2/ab")
@RequiredArgsConstructor
public class ABComparisonController {

    private final ABComparisonService comparisonService;
    private final ABComparisonRepository repository;

    @GetMapping("/comparisons")
    public Flux<ABComparison> getComparisons(
            @RequestParam(required = false) Instant since,
            @RequestParam(defaultValue = "50") int limit) {

        Instant start = since != null ? since : Instant.now().minus(Duration.ofDays(7));
        return repository.findByTimestampBetween(start, Instant.now())
            .take(limit);
    }

    @GetMapping("/comparisons/{traceId}")
    public Mono<ABComparison> getComparison(@PathVariable String traceId) {
        return repository.findByTraceId(traceId);
    }

    @GetMapping("/stats")
    public Mono<ABStats> getStats(
            @RequestParam(required = false) Instant since) {

        Instant start = since != null ? since : Instant.now().minus(Duration.ofDays(7));
        return repository.getAggregatedStats(start)
            .collectList()
            .map(this::buildStats);
    }

    @GetMapping("/comparison/{traceId}/diff")
    public Mono<ABDiff> getTextDiff(@PathVariable String traceId) {
        return repository.findByTraceId(traceId)
            .map(comparison -> ABDiff.builder()
                .traceId(traceId)
                .primaryText(comparison.getPrimaryText())
                .shadowText(comparison.getShadowText())
                .similarity(calculateSimilarity(
                    comparison.getPrimaryText(),
                    comparison.getShadowText()
                ))
                .build());
    }
}
```

#### 3.4.2 React Dashboard Component

```typescript
// components/ABDashboard.tsx
import React, { useState, useEffect } from 'react';

interface ABComparison {
  traceId: string;
  timestamp: string;
  inputMessage: string;
  primaryEngine: string;
  primaryText: string;
  primaryDuration: number;
  shadowEngine: string;
  shadowText: string;
  shadowDuration: number;
}

interface ABStats {
  totalComparisons: number;
  avgPrimaryDuration: number;
  avgShadowDuration: number;
  byEngine: Record<string, {
    count: number;
    avgDuration: number;
  }>;
}

export function ABDashboard() {
  const [comparisons, setComparisons] = useState<ABComparison[]>([]);
  const [stats, setStats] = useState<ABStats | null>(null);
  const [selected, setSelected] = useState<ABComparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v2/ab/comparisons?limit=100').then(r => r.json()),
      fetch('/api/v2/ab/stats').then(r => r.json())
    ]).then(([comps, st]) => {
      setComparisons(comps);
      setStats(st);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading A/B data...</div>;

  return (
    <div className="ab-dashboard">
      <h2>A/B Test Results</h2>

      {/* Stats Summary */}
      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <h4>Total Comparisons</h4>
            <div className="stat-value">{stats.totalComparisons}</div>
          </div>
          <div className="stat-card">
            <h4>Avg Primary Duration</h4>
            <div className="stat-value">{stats.avgPrimaryDuration.toFixed(0)}ms</div>
          </div>
          <div className="stat-card">
            <h4>Avg Shadow Duration</h4>
            <div className="stat-value">{stats.avgShadowDuration.toFixed(0)}ms</div>
          </div>
        </div>
      )}

      {/* Comparison List */}
      <div className="comparison-list">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Input</th>
              <th>Primary</th>
              <th>Shadow</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map(comp => (
              <tr key={comp.traceId} onClick={() => setSelected(comp)}>
                <td>{new Date(comp.timestamp).toLocaleString()}</td>
                <td className="truncate">{comp.inputMessage}</td>
                <td>
                  {comp.primaryEngine} ({comp.primaryDuration}ms)
                </td>
                <td>
                  {comp.shadowEngine} ({comp.shadowDuration}ms)
                </td>
                <td>
                  <button onClick={() => setSelected(comp)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <ABComparisonModal
          comparison={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ABComparisonModal({
  comparison,
  onClose
}: {
  comparison: ABComparison;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Comparison: {comparison.traceId}</h3>

        <div className="input-section">
          <h4>Input</h4>
          <p>{comparison.inputMessage}</p>
        </div>

        <div className="comparison-columns">
          <div className="column primary">
            <h4>{comparison.primaryEngine} (Primary)</h4>
            <div className="metrics">
              Duration: {comparison.primaryDuration}ms
            </div>
            <div className="output">{comparison.primaryText}</div>
          </div>

          <div className="column shadow">
            <h4>{comparison.shadowEngine} (Shadow)</h4>
            <div className="metrics">
              Duration: {comparison.shadowDuration}ms
            </div>
            <div className="output">{comparison.shadowText}</div>
          </div>
        </div>

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

### Acceptance Criteria

- [ ] Dashboard shows list of A/B comparisons
- [ ] Stats summary displayed
- [ ] Side-by-side comparison view
- [ ] Duration metrics visible
- [ ] Filter by date range

---

## Testing Strategy

### Unit Tests

| Component | Test Cases |
|-----------|------------|
| ToolRegistry | Tool registration, filtering by role |
| ToolExecutor | Execution, timeout, parallel execution |
| ABStreamHandler | Primary streaming, shadow collection |

### Integration Tests

| Test | Description |
|------|-------------|
| Tool calling loop | Full multi-turn conversation with tools |
| A/B collection | Both engines collected and saved |
| Dashboard API | Stats aggregation |

### Manual Testing Checklist

- [ ] Ask question requiring tool call
- [ ] Verify tool executes correctly
- [ ] Verify tool result appears in response
- [ ] Send request with `engine=ab`
- [ ] Verify both engine results saved
- [ ] View comparison in dashboard

---

## Definition of Done

### Code Complete

- [ ] Tool calling orchestration implemented
- [ ] Domain tools implemented
- [ ] A/B mode in Gateway
- [ ] Comparison data collection
- [ ] Dashboard API and UI

### Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual validation completed

### Documentation

- [ ] Tool definitions documented
- [ ] A/B testing guide
- [ ] Dashboard user guide

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| 3.1 Tool Calling Orchestration | 4 days |
| 3.2 Domain Tool Implementations | 3 days |
| 3.3 A/B Testing Mode | 3 days |
| 3.4 A/B Dashboard | 2 days |
| Testing & Integration | 2 days |
| **Total** | **14 days** |

---

*Phase 3 Document Version: 1.0*
*Last Updated: 2026-01-29*
