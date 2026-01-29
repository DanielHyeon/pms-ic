# Phase 1: Foundation

## SSE Streaming Infrastructure Setup

---

## Overview

| Attribute | Value |
|-----------|-------|
| Phase | 1 of 4 |
| Focus | Core streaming infrastructure |
| Dependencies | None (starting point) |
| Deliverables | Working SSE streaming from React to vLLM |

---

## Objectives

1. Define and implement Standard SSE Event Contract
2. Implement WebFlux streaming endpoint in Chat API
3. Implement LLM Gateway with vLLM connection
4. Integrate React frontend with fetch streaming

---

## Task 1.1: Standard SSE Event Contract Definition

### Description

Establish the immutable contract for SSE events that all components will adhere to.

### Deliverables

#### 1.1.1 Event Type Definitions

```java
// com.insuretech.pms.chat.api.dto.sse

public enum SseEventType {
    META,    // Metadata about the stream
    DELTA,   // Content chunks
    DONE,    // Stream completion
    ERROR    // Error termination
}

public enum DeltaKind {
    TEXT,           // User-visible text
    TOOL_CALL,      // Complete tool invocation
    TOOL_CALL_DELTA,// Streaming tool arguments
    JSON,           // JSON schema output
    DEBUG           // Development only
}
```

#### 1.1.2 Event Payload DTOs

```java
// MetaEvent.java
@Data
@Builder
public class MetaEvent {
    private String traceId;
    private String engine;      // "vllm" | "gguf"
    private String model;
    private String mode;        // "chat" | "completion"
    private Instant timestamp;
}

// DeltaEvent.java
@Data
@Builder
public class DeltaEvent {
    private DeltaKind kind;
    private String text;        // for TEXT kind
    private ToolCall toolCall;  // for TOOL_CALL kind
    private String json;        // for JSON kind
}

// ToolCall.java
@Data
@Builder
public class ToolCall {
    private String id;
    private String name;
    private String arguments;   // JSON string
}

// DoneEvent.java
@Data
@Builder
public class DoneEvent {
    private String finishReason; // "stop" | "tool_calls" | "length"
    private UsageInfo usage;
}

// ErrorEvent.java
@Data
@Builder
public class ErrorEvent {
    private String code;
    private String message;
    private String traceId;
}
```

#### 1.1.3 SSE Builder Utility

```java
// SseEventBuilder.java
@Component
public class SseEventBuilder {

    public ServerSentEvent<String> meta(MetaEvent event) {
        return ServerSentEvent.<String>builder()
            .event("meta")
            .data(toJson(event))
            .build();
    }

    public ServerSentEvent<String> delta(DeltaEvent event) {
        return ServerSentEvent.<String>builder()
            .event("delta")
            .data(toJson(event))
            .build();
    }

    public ServerSentEvent<String> done(DoneEvent event) {
        return ServerSentEvent.<String>builder()
            .event("done")
            .data(toJson(event))
            .build();
    }

    public ServerSentEvent<String> error(ErrorEvent event) {
        return ServerSentEvent.<String>builder()
            .event("error")
            .data(toJson(event))
            .build();
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

### Acceptance Criteria

- [ ] All event DTOs created and documented
- [ ] SseEventBuilder utility implemented
- [ ] Unit tests for serialization/deserialization
- [ ] OpenAPI schema documentation

---

## Task 1.2: Chat API Streaming Endpoint

### Description

Implement the WebFlux-based streaming endpoint that receives chat requests and returns SSE streams.

### Package Structure

```
com.insuretech.pms.chat
├── reactive/
│   ├── controller/
│   │   └── ReactiveChatController.java
│   ├── service/
│   │   ├── ReactiveChatStreamService.java
│   │   └── ReactiveChatSessionService.java
│   ├── client/
│   │   └── LlmGatewayClient.java
│   └── dto/
│       ├── ChatStreamRequest.java
│       ├── ChatStreamResponse.java
│       └── sse/
│           ├── MetaEvent.java
│           ├── DeltaEvent.java
│           ├── DoneEvent.java
│           └── ErrorEvent.java
```

### Deliverables

#### 1.2.1 Request/Response DTOs

```java
// ChatStreamRequest.java
@Data
@Builder
public class ChatStreamRequest {
    private String sessionId;           // Optional, creates new if null
    private String message;             // User message
    private String engine;              // "auto" | "gguf" | "vllm" | "ab"
    private List<ChatMessage> context;  // Previous messages (optional)
    private List<String> retrievedDocs; // RAG documents (optional)

    @Builder.Default
    private GenerationParams generation = GenerationParams.defaults();
}

// GenerationParams.java
@Data
@Builder
public class GenerationParams {
    @Builder.Default
    private Double temperature = 0.2;
    @Builder.Default
    private Double topP = 0.9;
    @Builder.Default
    private Integer maxTokens = 768;
    private List<String> stop;

    public static GenerationParams defaults() {
        return GenerationParams.builder().build();
    }
}

// ChatMessage.java
@Data
@Builder
public class ChatMessage {
    private String role;    // "user" | "assistant" | "system" | "tool"
    private String content;
    private String name;    // For tool messages
    private String toolCallId; // For tool response
}
```

#### 1.2.2 Controller Implementation

```java
// ReactiveChatController.java
@RestController
@RequestMapping("/api/v2/chat")
@RequiredArgsConstructor
@Slf4j
public class ReactiveChatController {

    private final ReactiveChatStreamService streamService;
    private final ReactiveChatSessionService sessionService;

    /**
     * SSE Streaming chat endpoint
     */
    @PostMapping(
        value = "/stream",
        produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public Flux<ServerSentEvent<String>> streamChat(
            @RequestBody ChatStreamRequest request,
            @AuthenticationPrincipal UserDetails user) {

        String traceId = UUID.randomUUID().toString();
        log.info("Stream chat request: traceId={}, user={}", traceId, user.getUsername());

        return streamService.streamMessage(request, user, traceId)
            .doOnError(e -> log.error("Stream error: traceId={}", traceId, e))
            .doOnComplete(() -> log.info("Stream complete: traceId={}", traceId));
    }

    /**
     * Non-streaming chat endpoint (backward compatible)
     */
    @PostMapping("/message")
    public Mono<ChatResponse> sendMessage(
            @RequestBody ChatStreamRequest request,
            @AuthenticationPrincipal UserDetails user) {

        return streamService.sendMessageNonStreaming(request, user);
    }

    /**
     * Get chat history
     */
    @GetMapping("/history/{sessionId}")
    public Flux<ChatMessage> getHistory(@PathVariable String sessionId) {
        return sessionService.getHistory(sessionId);
    }

    /**
     * Delete session
     */
    @DeleteMapping("/session/{sessionId}")
    public Mono<Void> deleteSession(@PathVariable String sessionId) {
        return sessionService.deleteSession(sessionId);
    }

    /**
     * SSE health check
     */
    @GetMapping(
        value = "/health/stream",
        produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public Flux<ServerSentEvent<String>> healthStream() {
        return Flux.interval(Duration.ofSeconds(1))
            .take(5)
            .map(i -> ServerSentEvent.<String>builder()
                .event("ping")
                .data("{\"count\":" + i + "}")
                .build());
    }
}
```

#### 1.2.3 Service Implementation

```java
// ReactiveChatStreamService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ReactiveChatStreamService {

    private final LlmGatewayClient gatewayClient;
    private final ReactiveChatSessionService sessionService;
    private final SseEventBuilder sseBuilder;

    public Flux<ServerSentEvent<String>> streamMessage(
            ChatStreamRequest request,
            UserDetails user,
            String traceId) {

        // 1. Ensure session exists
        Mono<String> sessionMono = sessionService
            .ensureSession(request.getSessionId(), user.getUsername());

        // 2. Build the streaming pipeline
        return sessionMono.flatMapMany(sessionId -> {
            // 3. Save user message
            Mono<Void> saveUserMsg = sessionService
                .saveMessage(sessionId, "user", request.getMessage());

            // 4. Build gateway request
            GatewayRequest gatewayRequest = buildGatewayRequest(
                request, user, traceId, sessionId
            );

            // 5. Stream from gateway and process
            StringBuilder buffer = new StringBuilder();

            return saveUserMsg.thenMany(
                gatewayClient.streamChat(gatewayRequest)
                    .doOnNext(event -> {
                        // Accumulate text for final save
                        if ("delta".equals(event.event())) {
                            DeltaEvent delta = parseData(event.data(), DeltaEvent.class);
                            if (delta.getKind() == DeltaKind.TEXT) {
                                buffer.append(delta.getText());
                            }
                        }
                    })
                    .concatWith(
                        // Save assistant message on completion
                        Mono.defer(() -> sessionService
                            .saveMessage(sessionId, "assistant", buffer.toString()))
                            .then(Mono.empty())
                    )
            );
        })
        .onErrorResume(e -> {
            log.error("Stream error: traceId={}", traceId, e);
            return Flux.just(sseBuilder.error(ErrorEvent.builder()
                .code("STREAM_ERROR")
                .message(e.getMessage())
                .traceId(traceId)
                .build()));
        });
    }

    private GatewayRequest buildGatewayRequest(
            ChatStreamRequest request,
            UserDetails user,
            String traceId,
            String sessionId) {

        return GatewayRequest.builder()
            .traceId(traceId)
            .engine(request.getEngine() != null ? request.getEngine() : "auto")
            .stream(true)
            .messages(buildMessages(request))
            .generation(request.getGeneration())
            .safety(SafetyContext.builder()
                .userId(user.getUsername())
                .sessionId(sessionId)
                .build())
            .build();
    }

    private List<ChatMessage> buildMessages(ChatStreamRequest request) {
        List<ChatMessage> messages = new ArrayList<>();

        // System message
        messages.add(ChatMessage.builder()
            .role("system")
            .content(getSystemPrompt())
            .build());

        // Context (history)
        if (request.getContext() != null) {
            messages.addAll(request.getContext());
        }

        // RAG documents as context
        if (request.getRetrievedDocs() != null && !request.getRetrievedDocs().isEmpty()) {
            String ragContext = String.join("\n\n", request.getRetrievedDocs());
            messages.add(ChatMessage.builder()
                .role("system")
                .content("Reference documents:\n" + ragContext)
                .build());
        }

        // User message
        messages.add(ChatMessage.builder()
            .role("user")
            .content(request.getMessage())
            .build());

        return messages;
    }
}
```

#### 1.2.4 Gateway Client

```java
// LlmGatewayClient.java
@Component
@RequiredArgsConstructor
@Slf4j
public class LlmGatewayClient {

    private final WebClient webClient;

    @Value("${llm.gateway.url:http://llm-gateway:8080}")
    private String gatewayUrl;

    public Flux<ServerSentEvent<String>> streamChat(GatewayRequest request) {
        return webClient.post()
            .uri(gatewayUrl + "/llm/chat/stream")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(String.class)
            .filter(line -> !line.isEmpty())
            .bufferUntil(line -> line.startsWith("data:"))
            .map(this::parseRawSse)
            .filter(Objects::nonNull)
            .timeout(Duration.ofSeconds(90))
            .onErrorResume(TimeoutException.class, e -> {
                log.error("Gateway timeout: traceId={}", request.getTraceId());
                return Flux.error(new GatewayTimeoutException("LLM Gateway timeout"));
            });
    }

    private ServerSentEvent<String> parseRawSse(List<String> lines) {
        String event = "message";
        String data = null;

        for (String line : lines) {
            if (line.startsWith("event:")) {
                event = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
                data = line.substring(5).trim();
            }
        }

        if (data == null) return null;

        return ServerSentEvent.<String>builder()
            .event(event)
            .data(data)
            .build();
    }
}
```

### Configuration

```yaml
# application.yml
llm:
  gateway:
    url: ${LLM_GATEWAY_URL:http://llm-gateway:8080}
    timeout:
      connect: 5s
      read: 90s
    retry:
      max-attempts: 2
      backoff: 1s
```

### Acceptance Criteria

- [ ] Controller endpoints implemented
- [ ] Service layer with message persistence
- [ ] Gateway client with SSE parsing
- [ ] Error handling and logging
- [ ] Integration tests with mock gateway

---

## Task 1.3: LLM Gateway Implementation

### Description

Create the Spring Cloud Gateway application that routes requests to LLM workers and transforms SSE responses.

### Project Structure

```
llm-gateway/
├── src/main/java/com/insuretech/pms/gateway/
│   ├── LlmGatewayApplication.java
│   ├── config/
│   │   ├── WebClientConfig.java
│   │   ├── RouteConfig.java
│   │   └── ResilienceConfig.java
│   ├── handler/
│   │   └── LlmStreamHandler.java
│   ├── router/
│   │   └── EngineRouter.java
│   ├── transformer/
│   │   ├── OpenAiSseTransformer.java
│   │   └── StandardSseEmitter.java
│   └── dto/
│       ├── GatewayRequest.java
│       └── WorkerRequest.java
├── src/main/resources/
│   └── application.yml
└── pom.xml
```

### Deliverables

#### 1.3.1 Gateway Application

```java
// LlmGatewayApplication.java
@SpringBootApplication
public class LlmGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(LlmGatewayApplication.class, args);
    }
}
```

#### 1.3.2 Stream Handler

```java
// LlmStreamHandler.java
@Component
@RequiredArgsConstructor
@Slf4j
public class LlmStreamHandler {

    private final EngineRouter engineRouter;
    private final OpenAiSseTransformer transformer;
    private final WebClient webClient;

    public Flux<ServerSentEvent<String>> handleStream(GatewayRequest request) {
        String traceId = request.getTraceId();
        String engine = engineRouter.selectEngine(request);
        String workerUrl = engineRouter.getWorkerUrl(engine);

        log.info("Routing to engine: {} for traceId: {}", engine, traceId);

        // Build OpenAI-compatible request
        WorkerRequest workerRequest = buildWorkerRequest(request);

        // Emit meta event first
        ServerSentEvent<String> metaEvent = buildMetaEvent(traceId, engine);

        // Stream from worker and transform
        Flux<ServerSentEvent<String>> workerStream = webClient.post()
            .uri(workerUrl + "/v1/chat/completions")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(workerRequest)
            .retrieve()
            .bodyToFlux(String.class)
            .transform(transformer::transformOpenAiSse);

        return Flux.concat(
            Flux.just(metaEvent),
            workerStream
        );
    }

    private WorkerRequest buildWorkerRequest(GatewayRequest request) {
        return WorkerRequest.builder()
            .model("default")
            .messages(request.getMessages())
            .stream(true)
            .temperature(request.getGeneration().getTemperature())
            .maxTokens(request.getGeneration().getMaxTokens())
            .topP(request.getGeneration().getTopP())
            .build();
    }

    private ServerSentEvent<String> buildMetaEvent(String traceId, String engine) {
        String data = String.format(
            "{\"traceId\":\"%s\",\"engine\":\"%s\",\"timestamp\":\"%s\"}",
            traceId, engine, Instant.now()
        );
        return ServerSentEvent.<String>builder()
            .event("meta")
            .data(data)
            .build();
    }
}
```

#### 1.3.3 Engine Router

```java
// EngineRouter.java
@Component
@Slf4j
public class EngineRouter {

    @Value("${workers.vllm.url:http://vllm-worker:8000}")
    private String vllmUrl;

    @Value("${workers.gguf.url:http://gguf-worker:8080}")
    private String ggufUrl;

    @Value("${workers.default:vllm}")
    private String defaultEngine;

    public String selectEngine(GatewayRequest request) {
        String engine = request.getEngine();

        if (engine == null || "auto".equals(engine)) {
            return selectAutoEngine(request);
        }

        if ("ab".equals(engine)) {
            // For Phase 3: A/B testing
            return defaultEngine;
        }

        return engine;
    }

    private String selectAutoEngine(GatewayRequest request) {
        // Rule 1: Tools or JSON schema -> vLLM
        if (request.hasTools() || request.hasResponseFormat()) {
            log.debug("Auto routing to vLLM: tools/schema detected");
            return "vllm";
        }

        // Rule 2: Default to configured engine
        return defaultEngine;
    }

    public String getWorkerUrl(String engine) {
        return switch (engine) {
            case "vllm" -> vllmUrl;
            case "gguf" -> ggufUrl;
            default -> vllmUrl;
        };
    }
}
```

#### 1.3.4 OpenAI SSE Transformer

```java
// OpenAiSseTransformer.java
@Component
@Slf4j
public class OpenAiSseTransformer {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Transform OpenAI SSE format to Standard SSE format
     *
     * Input:  data: {"choices":[{"delta":{"content":"text"}}]}
     * Output: event: delta\ndata: {"kind":"text","text":"text"}
     */
    public Flux<ServerSentEvent<String>> transformOpenAiSse(Flux<String> upstream) {
        return upstream
            .filter(line -> line.startsWith("data: "))
            .map(line -> line.substring(6).trim())
            .filter(data -> !data.equals("[DONE]"))
            .map(this::parseAndTransform)
            .filter(Objects::nonNull)
            .concatWith(Flux.just(buildDoneEvent()));
    }

    private ServerSentEvent<String> parseAndTransform(String jsonData) {
        try {
            JsonNode root = objectMapper.readTree(jsonData);
            JsonNode choices = root.path("choices");

            if (choices.isEmpty() || choices.isNull()) {
                return null;
            }

            JsonNode delta = choices.get(0).path("delta");

            // Check for content (text)
            if (delta.has("content") && !delta.get("content").isNull()) {
                String content = delta.get("content").asText();
                if (!content.isEmpty()) {
                    return buildDeltaEvent("text", content, null);
                }
            }

            // Check for tool calls
            if (delta.has("tool_calls")) {
                JsonNode toolCalls = delta.get("tool_calls");
                return buildToolCallDelta(toolCalls);
            }

            // Check for finish reason
            JsonNode finishReason = choices.get(0).path("finish_reason");
            if (!finishReason.isNull()) {
                // Will be handled by [DONE]
                return null;
            }

            return null;
        } catch (Exception e) {
            log.warn("Failed to parse OpenAI SSE: {}", jsonData, e);
            return null;
        }
    }

    private ServerSentEvent<String> buildDeltaEvent(
            String kind, String text, JsonNode toolCall) {

        try {
            Map<String, Object> data = new HashMap<>();
            data.put("kind", kind);

            if (text != null) {
                data.put("text", text);
            }
            if (toolCall != null) {
                data.put("toolCall", objectMapper.treeToValue(toolCall, Map.class));
            }

            return ServerSentEvent.<String>builder()
                .event("delta")
                .data(objectMapper.writeValueAsString(data))
                .build();
        } catch (Exception e) {
            log.error("Failed to build delta event", e);
            return null;
        }
    }

    private ServerSentEvent<String> buildToolCallDelta(JsonNode toolCalls) {
        // For Phase 3: Tool calling support
        return buildDeltaEvent("tool_call_delta", null, toolCalls);
    }

    private ServerSentEvent<String> buildDoneEvent() {
        return ServerSentEvent.<String>builder()
            .event("done")
            .data("{}")
            .build();
    }
}
```

#### 1.3.5 Route Configuration

```java
// RouteConfig.java
@Configuration
public class RouteConfig {

    @Bean
    public RouterFunction<ServerResponse> llmRoutes(LlmStreamHandler handler) {
        return RouterFunctions.route()
            .POST("/llm/chat/stream", request ->
                request.bodyToMono(GatewayRequest.class)
                    .flatMap(req -> ServerResponse.ok()
                        .contentType(MediaType.TEXT_EVENT_STREAM)
                        .body(handler.handleStream(req), ServerSentEvent.class))
            )
            .GET("/health", request ->
                ServerResponse.ok().bodyValue(Map.of("status", "UP"))
            )
            .build();
    }
}
```

#### 1.3.6 Gateway Configuration

```yaml
# application.yml
server:
  port: 8080

spring:
  application:
    name: llm-gateway

workers:
  vllm:
    url: ${VLLM_WORKER_URL:http://vllm-worker:8000}
  gguf:
    url: ${GGUF_WORKER_URL:http://gguf-worker:8080}
  default: vllm

resilience4j:
  circuitbreaker:
    instances:
      vllm:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
      gguf:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s

  timelimiter:
    instances:
      default:
        timeoutDuration: 90s

logging:
  level:
    com.insuretech.pms.gateway: DEBUG
```

### Acceptance Criteria

- [ ] Gateway application bootstraps successfully
- [ ] Routes requests to vLLM worker
- [ ] Transforms OpenAI SSE to Standard SSE
- [ ] Meta event emitted at stream start
- [ ] Done event emitted at stream end
- [ ] Error handling for worker failures

---

## Task 1.4: React Frontend Integration

### Description

Update React frontend to use fetch with ReadableStream for SSE consumption.

### Deliverables

#### 1.4.1 SSE Client Hook

```typescript
// hooks/useChatStream.ts
import { useState, useCallback, useRef } from 'react';

interface SSEEvent {
  event: string;
  data: any;
}

interface ChatStreamOptions {
  onMeta?: (data: MetaEvent) => void;
  onDelta?: (data: DeltaEvent) => void;
  onDone?: (data: DoneEvent) => void;
  onError?: (data: ErrorEvent) => void;
}

interface MetaEvent {
  traceId: string;
  engine: string;
  model?: string;
  timestamp: string;
}

interface DeltaEvent {
  kind: 'text' | 'tool_call' | 'tool_call_delta' | 'json' | 'debug';
  text?: string;
  toolCall?: ToolCall;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface DoneEvent {
  finishReason?: string;
}

interface ErrorEvent {
  code: string;
  message: string;
  traceId?: string;
}

export function useChatStream(options: ChatStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamChat = useCallback(async (request: ChatStreamRequest) => {
    setIsStreaming(true);
    setContent('');
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v2/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const events = parseSSEBuffer(buffer);
        buffer = events.remaining;

        for (const event of events.parsed) {
          handleEvent(event, options, setContent);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        options.onError?.({
          code: 'FETCH_ERROR',
          message: err.message,
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [options]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    streamChat,
    cancel,
    isStreaming,
    content,
    error,
  };
}

function parseSSEBuffer(buffer: string): {
  parsed: SSEEvent[];
  remaining: string;
} {
  const events: SSEEvent[] = [];
  const chunks = buffer.split('\n\n');
  const remaining = chunks.pop() || '';

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    let event = 'message';
    let data = '';

    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.slice(5).trim();
      }
    }

    if (data) {
      try {
        events.push({
          event,
          data: JSON.parse(data),
        });
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return { parsed: events, remaining };
}

function handleEvent(
  event: SSEEvent,
  options: ChatStreamOptions,
  setContent: React.Dispatch<React.SetStateAction<string>>
) {
  switch (event.event) {
    case 'meta':
      options.onMeta?.(event.data);
      break;

    case 'delta':
      const delta = event.data as DeltaEvent;
      if (delta.kind === 'text' && delta.text) {
        setContent(prev => prev + delta.text);
      }
      options.onDelta?.(delta);
      break;

    case 'done':
      options.onDone?.(event.data);
      break;

    case 'error':
      options.onError?.(event.data);
      break;
  }
}
```

#### 1.4.2 Chat Component Update

```typescript
// components/ChatPanel.tsx
import React, { useState } from 'react';
import { useChatStream } from '../hooks/useChatStream';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [engine, setEngine] = useState<string>('auto');
  const [meta, setMeta] = useState<MetaEvent | null>(null);

  const { streamChat, cancel, isStreaming, content, error } = useChatStream({
    onMeta: (data) => {
      setMeta(data);
    },
    onDone: () => {
      // Add completed assistant message to history
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content }
      ]);
    },
    onError: (data) => {
      console.error('Stream error:', data);
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    // Add user message
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Start streaming
    await streamChat({
      message: input,
      engine,
      context: messages.slice(-10), // Last 10 messages
    });
  };

  return (
    <div className="chat-panel">
      {/* Engine selector (dev mode) */}
      <div className="engine-selector">
        <select value={engine} onChange={e => setEngine(e.target.value)}>
          <option value="auto">Auto</option>
          <option value="vllm">vLLM</option>
          <option value="gguf">GGUF</option>
        </select>
        {meta && <span className="meta-info">Engine: {meta.engine}</span>}
      </div>

      {/* Message list */}
      <div className="message-list">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && content && (
          <div className="message assistant streaming">
            {content}
            <span className="cursor">|</span>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && <div className="error-banner">{error}</div>}

      {/* Input area */}
      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={isStreaming}
          placeholder="Type a message..."
        />
        {isStreaming ? (
          <button onClick={cancel}>Cancel</button>
        ) : (
          <button onClick={handleSend}>Send</button>
        )}
      </div>
    </div>
  );
}
```

### Acceptance Criteria

- [ ] useChatStream hook implemented
- [ ] SSE parsing handles all event types
- [ ] Streaming text displays incrementally
- [ ] Cancel functionality works
- [ ] Error handling displays appropriately
- [ ] Engine selector for dev testing

---

## Testing Strategy

### Unit Tests

| Component | Test Cases |
|-----------|------------|
| SseEventBuilder | Serialization of all event types |
| OpenAiSseTransformer | Transform various OpenAI responses |
| EngineRouter | Auto routing rules |

### Integration Tests

| Test | Description |
|------|-------------|
| Chat API → Mock Gateway | Full stream with persistence |
| Gateway → Mock vLLM | SSE transformation |
| End-to-end | React → Chat API → Gateway → Mock Worker |

### Manual Testing Checklist

- [ ] Send message and receive streaming response
- [ ] Verify meta event contains correct engine
- [ ] Verify delta events accumulate correctly
- [ ] Verify done event signals completion
- [ ] Test error handling (kill worker mid-stream)
- [ ] Test client disconnect (refresh page)
- [ ] Test timeout handling

---

## Definition of Done

### Code Complete

- [ ] All deliverables implemented
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] No critical SonarQube issues

### Documentation

- [ ] API documentation (OpenAPI)
- [ ] Code comments for complex logic
- [ ] README updates

### Deployment

- [ ] Docker images build successfully
- [ ] docker-compose configuration updated
- [ ] Environment variables documented

### Review

- [ ] Code review approved
- [ ] Demo to team completed
- [ ] Stakeholder sign-off

---

## Dependencies & Risks

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| vLLM Worker | Required | Must be running for integration tests |
| PostgreSQL | Required | For session/message persistence |
| Redis | Optional | Can skip caching initially |

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| vLLM SSE format changes | High | Pin vLLM version, add format tests |
| WebFlux complexity | Medium | Start simple, add features incrementally |
| Browser SSE limitations | Low | Using fetch instead of EventSource |

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| 1.1 SSE Event Contract | 1 day |
| 1.2 Chat API Streaming | 3 days |
| 1.3 LLM Gateway | 3 days |
| 1.4 React Integration | 2 days |
| Testing & Integration | 2 days |
| Documentation & Review | 1 day |
| **Total** | **12 days** |

---

*Phase 1 Document Version: 1.0*
*Last Updated: 2026-01-29*
