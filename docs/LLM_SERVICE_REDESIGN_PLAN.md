# LLM Service Redesign Plan

## GGUF & vLLM Interoperability Architecture

> Spring WebFlux + R2DBC + Spring Cloud Gateway + Tool Calling

---

## 1. Executive Summary

### 1.1 Objectives

- **Loose Coupling**: Complete separation between LLM engines (GGUF/vLLM)
- **Runtime Switching**: Engine selection per request/session (gguf/vllm/auto/ab)
- **A/B Testing**: Quality comparison without UI complexity
- **Streaming First**: Flux-based SSE streaming throughout the pipeline
- **Tool Calling**: Support for vLLM tool calling and JSON schema

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + fetch ReadableStream |
| Chat API | Spring WebFlux + R2DBC (PostgreSQL) + Reactive Neo4j |
| LLM Gateway | Spring Cloud Gateway (WebFlux-based) |
| GGUF Worker | llama.cpp server (OpenAI compatible) |
| vLLM Worker | vLLM server (/v1/chat/completions) |
| Cache | Redis 7 (Reactive) |

---

## 2. Target Architecture

### 2.1 Four-Layer Architecture (Operational Separation)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              React (UI)                                  │
│                     POST /api/chat/stream (SSE)                         │
│                     fetch + ReadableStream                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ SSE (text/event-stream)
┌─────────────────────────────────────────────────────────────────────────┐
│                    Chat API Service (Spring WebFlux)                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Responsibilities:                                                │    │
│  │ • Authentication / RBAC                                          │    │
│  │ • Session / History persistence (R2DBC)                          │    │
│  │ • RAG / State queries (Reactive Neo4j + PostgreSQL)              │    │
│  │ • Tool execution (domain functions)                              │    │
│  │ • SSE streaming to UI                                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ SSE (text/event-stream)
┌─────────────────────────────────────────────────────────────────────────┐
│                   LLM Gateway (Spring Cloud Gateway)                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Responsibilities:                                                │    │
│  │ • Engine routing (gguf/vllm/auto/ab)                             │    │
│  │ • Standard SSE transformation                                    │    │
│  │ • Protection (Timeout/CB/RateLimit)                              │    │
│  │ • Observability (traceId propagation, metrics)                   │    │
│  │ • Worker health checks                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                          │                       │
                          ▼                       ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│        GGUF Worker               │  │        vLLM Worker               │
│  ┌────────────────────────────┐  │  │  ┌────────────────────────────┐  │
│  │ llama.cpp server           │  │  │  │ vLLM server                │  │
│  │ OpenAI compatible API      │  │  │  │ /v1/chat/completions       │  │
│  │ /v1/chat/completions       │  │  │  │ tools + response_format    │  │
│  │ stream=true                │  │  │  │ stream=true                │  │
│  └────────────────────────────┘  │  │  └────────────────────────────┘  │
└──────────────────────────────────┘  └──────────────────────────────────┘
```

### 2.2 Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| Chat API knows only Gateway | Never calls Workers directly |
| Gateway absorbs engine differences | Standardizes all SSE formats |
| Workers are completely isolated | Separate containers/ports/resources |
| Switching via request parameter | `engine=gguf\|vllm\|ab\|auto` |

---

## 3. Standard SSE Event Contract

### 3.1 Event Types (4 types - fixed)

| Event | Description |
|-------|-------------|
| `meta` | Engine/model/traceId/latency metadata |
| `delta` | Text or tool call chunk |
| `done` | Normal completion |
| `error` | Error termination |

### 3.2 Delta Payload with Kind (Tool Calling Support)

```typescript
// delta.kind values
type DeltaKind =
  | "text"           // User-visible text chunk
  | "tool_call"      // Complete tool call
  | "tool_call_delta"// Tool call argument chunk (streaming)
  | "json"           // JSON schema output chunk
  | "debug";         // Development only
```

### 3.3 SSE Format Examples

```
event: meta
data: {"traceId":"uuid-xxx","engine":"vllm","model":"Qwen2.5-7B-Instruct","mode":"chat"}

event: delta
data: {"kind":"text","text":"Hello"}

event: delta
data: {"kind":"text","text":" world"}

event: delta
data: {"kind":"tool_call","name":"getProjectStatus","arguments":{"projectId":"p1"},"id":"call_1"}

event: done
data: {}

event: error
data: {"message":"Timeout exceeded","code":"TIMEOUT"}
```

### 3.4 Processing Rules

| Rule | Description |
|------|-------------|
| Concatenate `delta.text` | Forms the final response |
| `done` = stream end | Close connection gracefully |
| `error` = show message | Display to user + close stream |
| `tool_call` = execute | Chat API runs tool, continues stream |

---

## 4. API Endpoint Design

### 4.1 React → Chat API

#### Streaming Chat (Primary)

```
POST /api/v2/chat/stream
Content-Type: application/json
Accept: text/event-stream

Request:
{
  "sessionId": "optional-uuid",
  "message": "User question",
  "engine": "auto|gguf|vllm|ab",
  "context": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "retrievedDocs": []
}

Response: text/event-stream (Standard SSE)
```

#### Non-Streaming Chat (Legacy Compatible)

```
POST /api/v2/chat/message
Content-Type: application/json

Response: application/json
{
  "reply": "...",
  "confidence": 0.95,
  "suggestions": []
}
```

### 4.2 Chat API → LLM Gateway

```
POST http://llm-gateway/llm/chat/stream
Content-Type: application/json
Accept: text/event-stream

Request:
{
  "traceId": "uuid",
  "engine": "auto|gguf|vllm|ab",
  "stream": true,
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "getProjectStatus",
        "description": "Get project status",
        "parameters": { ... }
      }
    }
  ],
  "generation": {
    "temperature": 0.2,
    "topP": 0.9,
    "maxTokens": 768,
    "stop": []
  },
  "safety": {
    "userAccessLevel": 3,
    "projectId": "p1"
  },
  "ab": {
    "primary": "vllm",
    "shadow": "gguf",
    "shadowCollect": true
  }
}

Response: text/event-stream (Standard SSE)
```

### 4.3 LLM Gateway → Workers

Both workers use OpenAI-compatible endpoints:

```
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "model-name",
  "messages": [...],
  "tools": [...],
  "stream": true,
  "temperature": 0.2,
  "max_tokens": 768
}
```

---

## 5. Chat API Service Design (WebFlux + R2DBC)

### 5.1 Package Structure

```
com.insuretech.pms.chat
├── api
│   ├── ReactiveChatController
│   └── dto
│       ├── ChatStreamRequest
│       ├── ChatMessageDto
│       └── GatewayEvent
├── application
│   ├── ReactiveChatStreamService
│   ├── ReactiveChatSessionService
│   ├── ToolOrchestrator
│   └── RagOrchestrator
├── infra
│   ├── gatewayclient
│   │   └── LlmGatewayClient
│   ├── persistence
│   │   ├── r2dbc
│   │   │   ├── ReactiveChatMessageRepository
│   │   │   └── ReactiveChatSessionRepository
│   │   └── neo4j
│   │       └── ReactiveNeo4jClient
│   └── observability
│       └── TraceIdFilter
└── domain
    ├── ChatSession
    ├── ChatMessage
    └── ToolDefinition
```

### 5.2 Streaming Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ReactiveChatStreamService Flow                        │
└─────────────────────────────────────────────────────────────────────────┘

1. Generate traceId
        │
        ▼
2. Ensure session (create if not exists) ──────────────────► R2DBC
        │
        ▼
3. Persist user message ───────────────────────────────────► R2DBC
        │
        ▼
4. Load history (recent N turns) ◄─────────────────────────── R2DBC
        │
        ▼
5. Execute RAG (Neo4j + PG) with permission filter ◄───────── Neo4j/PG
        │
        ▼
6. Compose messages[] = system + history + user + RAG context
        │
        ▼
7. Stream request to Gateway ──────────────────────────────► LLM Gateway
        │
        ▼
8. Process stream events:
   ┌─────────────────────────────────────────────────────────┐
   │  delta(text) ──► Forward to UI + accumulate in buffer  │
   │  delta(tool_call) ──► Execute tool ──► Continue stream │
   │  done ──► Save final assistant message                 │
   │  error ──► Forward error to UI                         │
   └─────────────────────────────────────────────────────────┘
        │
        ▼
9. On done: Save assistant message ────────────────────────► R2DBC
```

### 5.3 Tool Calling Orchestration

```java
// Conceptual flow - Chat API handles tool execution
public Flux<ServerSentEvent<?>> streamWithToolLoop(ChatRequest req) {
    return Flux.defer(() -> runOneTurn(buildMessages(req)))
        .expand(turnResult -> {
            if (turnResult.hasToolCalls()) {
                // Execute tools
                List<ToolResult> results = executeTools(turnResult.getToolCalls());
                // Append tool results to messages
                List<Message> updatedMessages = appendToolResults(
                    turnResult.getMessages(),
                    results
                );
                // Continue with next turn
                return runOneTurn(updatedMessages);
            }
            return Mono.empty(); // No more turns
        })
        .flatMap(TurnResult::getEvents);
}
```

### 5.4 Persistence Strategy

| Timing | Action |
|--------|--------|
| Stream start | Save user message (1 write) |
| Stream end (done) | Save assistant message (1 write) |
| Tool execution | Optionally save tool_call + tool_result |
| Client disconnect | Cancel upstream, optional partial save |

---

## 6. LLM Gateway Design (Spring Cloud Gateway)

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LLM Gateway Application                          │
├─────────────────────────────────────────────────────────────────────────┤
│  SCG Routes (YAML)           │  Custom Handler (Java)                   │
│  ─────────────────────────   │  ──────────────────────────────────────  │
│  • Entry point               │  • /llm/chat/stream endpoint             │
│  • Global filters            │  • Body parsing (engine/tools)           │
│  • Rate limit                │  • Engine selection logic                │
│  • Global timeout            │  • Worker SSE → Standard SSE transform   │
│  • Circuit breaker           │  • A/B mode handling                     │
│  • traceId propagation       │  • Error handling                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Routing Modes

| Mode | Behavior |
|------|----------|
| `engine=gguf` | Route to GGUF Worker only |
| `engine=vllm` | Route to vLLM Worker only |
| `engine=auto` | Rule-based selection (see below) |
| `engine=ab` | Primary stream to user, shadow collects in background |

### 6.3 Auto Routing Rules

```java
public String selectEngine(GatewayRequest request) {
    // Rule 1: Tools or JSON schema → vLLM (better support)
    if (request.hasTools() || request.hasResponseFormat()) {
        return "vllm";
    }

    // Rule 2: Long context / high concurrency → vLLM
    if (request.getContextLength() > CONTEXT_THRESHOLD) {
        return "vllm";
    }

    // Rule 3: Simple queries, dev mode → GGUF (cost-effective)
    return "gguf";
}
```

### 6.4 OpenAI SSE → Standard SSE Transformation

```java
// vLLM/GGUF OpenAI SSE format:
// data: {"choices":[{"delta":{"content":"text"}}]}
// data: {"choices":[{"delta":{"tool_calls":[...]}}]}
// data: [DONE]

// Transform to Standard SSE:
public Flux<ServerSentEvent<?>> transformOpenAiSse(Flux<String> upstream) {
    return upstream
        .filter(line -> line.startsWith("data: "))
        .map(line -> line.substring(6))
        .filter(data -> !data.equals("[DONE]"))
        .map(this::parseOpenAiChunk)
        .map(chunk -> {
            if (chunk.hasContent()) {
                return ServerSentEvent.builder()
                    .event("delta")
                    .data(Map.of("kind", "text", "text", chunk.getContent()))
                    .build();
            } else if (chunk.hasToolCalls()) {
                return ServerSentEvent.builder()
                    .event("delta")
                    .data(Map.of("kind", "tool_call", ...))
                    .build();
            }
            return null;
        })
        .filter(Objects::nonNull)
        .concatWith(Flux.just(
            ServerSentEvent.builder().event("done").data(Map.of()).build()
        ));
}
```

### 6.5 A/B Mode Implementation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           A/B Mode Flow                                  │
└─────────────────────────────────────────────────────────────────────────┘

                    Request (engine=ab)
                           │
                           ▼
              ┌────────────────────────┐
              │   Gateway A/B Router   │
              └────────────────────────┘
                    │           │
        ┌───────────┘           └───────────┐
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Primary (vLLM)  │              │  Shadow (GGUF)   │
│  Stream to user  │              │  Collect result  │
└──────────────────┘              └──────────────────┘
        │                                   │
        ▼                                   ▼
   User sees this               Stored for comparison
                                (traceId, latency, output)
```

**A/B Data Collection:**

| Field | Description |
|-------|-------------|
| traceId | Request identifier |
| engineA_output | Primary engine full response |
| engineB_output | Shadow engine full response |
| engineA_latency | Time to first token + total |
| engineB_latency | Time to first token + total |
| input_length | Message + context + RAG docs length |

---

## 7. Worker Configuration

### 7.1 GGUF Worker (llama.cpp server)

```yaml
# docker-compose.yml
gguf-worker:
  image: ghcr.io/ggerganov/llama.cpp:server
  command: >
    --host 0.0.0.0
    --port 8080
    --model /models/gemma-3-12b-pt.Q5_K_M.gguf
    --ctx-size 8192
    --n-gpu-layers 35
    --api-key ${GGUF_API_KEY}
  volumes:
    - ./models:/models
  ports:
    - "8081:8080"
  deploy:
    resources:
      limits:
        memory: 16G
```

**OpenAI Compatible Endpoint:**
```
POST http://gguf-worker:8080/v1/chat/completions
```

### 7.2 vLLM Worker

```yaml
# docker-compose.yml
vllm-worker:
  image: vllm/vllm-openai:latest
  command: >
    --model Qwen/Qwen2.5-7B-Instruct
    --host 0.0.0.0
    --port 8000
    --max-model-len 32768
    --enable-auto-tool-choice
    --tool-call-parser hermes
  ports:
    - "8082:8000"
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

**OpenAI Compatible Endpoint:**
```
POST http://vllm-worker:8000/v1/chat/completions
```

### 7.3 Worker Isolation Rules

| Rule | Description |
|------|-------------|
| Separate containers | Different processes |
| Separate ports | gguf:8081, vllm:8082 |
| Gateway-only access | Network policy restriction |
| Resource isolation | vLLM gets GPU, GGUF gets CPU/RAM |
| Health endpoints | `/health` for both |

---

## 8. Operational Safeguards

### 8.1 Gateway-Level Protection (Infrastructure)

| Protection | Configuration |
|------------|---------------|
| TTFT Timeout | 10 seconds (first token) |
| Total Timeout | 90 seconds (chat), 300 seconds (report) |
| Circuit Breaker | Fail-fast on worker failure |
| Rate Limit | Per-user, per-endpoint |
| Concurrency Limit | GGUF: 2, vLLM: higher |
| Retry | Short, idempotent requests only |

### 8.2 Chat API-Level Protection (Domain)

| Protection | Configuration |
|------------|---------------|
| maxTokens | Chat: 768, Report: 4096 |
| Messages Length | Max 32K characters |
| Retrieved Docs | Top-5, max 2K chars each |
| Tool Allowlist | Explicit permission per tool |
| Tool Execution Timeout | 30 seconds |

### 8.3 Circuit Breaker Configuration

```yaml
# application.yml (Gateway)
resilience4j:
  circuitbreaker:
    instances:
      vllm-worker:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
        permittedNumberOfCallsInHalfOpenState: 3
      gguf-worker:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
```

---

## 9. React Frontend Integration

### 9.1 fetch + ReadableStream Pattern

```typescript
async function streamChat(request: ChatRequest): AsyncGenerator<SSEEvent> {
  const response = await fetch('/api/v2/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const event = parseSSE(line);
      if (event) yield event;
    }
  }
}

function parseSSE(chunk: string): SSEEvent | null {
  const lines = chunk.split('\n');
  let event = 'message';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7);
    if (line.startsWith('data: ')) data = line.slice(6);
  }

  if (!data) return null;
  return { event, data: JSON.parse(data) };
}
```

### 9.2 Event Handling

```typescript
for await (const event of streamChat(request)) {
  switch (event.event) {
    case 'meta':
      // Optional: Display engine info
      setMeta(event.data);
      break;

    case 'delta':
      if (event.data.kind === 'text') {
        // Append to chat bubble
        appendText(event.data.text);
      }
      // tool_call, json, debug: hidden by default (dev panel only)
      break;

    case 'done':
      // Stream complete
      setLoading(false);
      break;

    case 'error':
      // Show error toast
      showError(event.data.message);
      setLoading(false);
      break;
  }
}
```

---

## 10. Implementation Roadmap

> **Detailed Phase Documents:** Each phase has a comprehensive implementation guide with code examples, acceptance criteria, and testing strategies.

### Phase 1: Foundation
📄 **[Detailed Plan: PHASE1_FOUNDATION.md](phases/PHASE1_FOUNDATION.md)**

| Step | Task | Status |
|------|------|--------|
| 1.1 | Define Standard SSE Event Contract | ✅ Complete |
| 1.2 | Implement `/api/v2/chat/stream` (Chat API) | 🔄 In Progress |
| 1.3 | Implement Gateway `/llm/chat/stream` (vLLM only) | ⏳ Pending |
| 1.4 | React fetch streaming integration | ⏳ Pending |

**Estimated Duration:** 12 days

### Phase 2: Engine Integration
📄 **[Detailed Plan: PHASE2_ENGINE_INTEGRATION.md](phases/PHASE2_ENGINE_INTEGRATION.md)**

| Step | Task | Status |
|------|------|--------|
| 2.1 | Configure GGUF Worker (OpenAI compat) | ⏳ Pending |
| 2.2 | Connect GGUF to Gateway | ⏳ Pending |
| 2.3 | Implement auto routing rules | ⏳ Pending |
| 2.4 | Test engine switching | ⏳ Pending |

**Estimated Duration:** 10 days

### Phase 3: Advanced Features
📄 **[Detailed Plan: PHASE3_ADVANCED_FEATURES.md](phases/PHASE3_ADVANCED_FEATURES.md)**

| Step | Task | Status |
|------|------|--------|
| 3.1 | Tool calling orchestration (Chat API) | ⏳ Pending |
| 3.2 | A/B mode (shadow collection) | ⏳ Pending |
| 3.3 | A/B comparison dashboard | ⏳ Pending |

**Estimated Duration:** 14 days

### Phase 4: Optimization
📄 **[Detailed Plan: PHASE4_OPTIMIZATION.md](phases/PHASE4_OPTIMIZATION.md)**

| Step | Task | Status |
|------|------|--------|
| 4.1 | R2DBC full reactive persistence | ⏳ Pending |
| 4.2 | Reactive Neo4j integration | ⏳ Pending |
| 4.3 | Observability (metrics, tracing) | ⏳ Pending |
| 4.4 | Performance tuning | ⏳ Pending |

**Estimated Duration:** 18 days

### Total Project Timeline

| Phase | Focus | Duration |
|-------|-------|----------|
| Phase 1 | Foundation | 12 days |
| Phase 2 | Engine Integration | 10 days |
| Phase 3 | Advanced Features | 14 days |
| Phase 4 | Optimization | 18 days |
| **Total** | | **54 days** |

---

## 11. Service Deployment Configuration

### 11.1 Docker Compose Services

```yaml
services:
  # Chat API Service
  chat-api:
    build: ./PMS_IC_BackEnd_v1.2
    ports:
      - "8083:8083"
    environment:
      - SPRING_PROFILES_ACTIVE=reactive
      - LLM_GATEWAY_URL=http://llm-gateway:8080
      - R2DBC_URL=r2dbc:postgresql://postgres:5433/pms
      - NEO4J_URI=bolt://neo4j:7687
    depends_on:
      - llm-gateway
      - postgres
      - neo4j
      - redis

  # LLM Gateway
  llm-gateway:
    build: ./llm-gateway
    ports:
      - "8084:8080"
    environment:
      - GGUF_WORKER_URL=http://gguf-worker:8080
      - VLLM_WORKER_URL=http://vllm-worker:8000
    depends_on:
      - gguf-worker
      - vllm-worker

  # GGUF Worker
  gguf-worker:
    image: ghcr.io/ggerganov/llama.cpp:server
    ports:
      - "8081:8080"
    volumes:
      - ./models:/models

  # vLLM Worker
  vllm-worker:
    image: vllm/vllm-openai:latest
    ports:
      - "8082:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### 11.2 Internal DNS

| Service | Internal URL |
|---------|--------------|
| Chat API → Gateway | http://llm-gateway:8080 |
| Gateway → GGUF | http://gguf-worker:8080 |
| Gateway → vLLM | http://vllm-worker:8000 |
| React → Chat API | http://chat-api:8083 (via nginx) |

---

## 12. Summary

### Architecture Benefits

| Benefit | How Achieved |
|---------|--------------|
| **Loose Coupling** | Chat API knows only Gateway; Gateway knows only Workers |
| **Engine Agnostic** | Standard SSE contract isolates engine differences |
| **Easy Switching** | `engine` parameter in request body |
| **A/B Testing** | Shadow execution without UI complexity |
| **Tool Support** | Chat API orchestrates tool loop, Gateway is stateless |
| **Scalability** | Each layer independently scalable |
| **Resilience** | Circuit breakers, timeouts at Gateway |

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| WebFlux over MVC | Native Flux streaming, no SseEmitter bridge |
| R2DBC over JPA | Non-blocking DB access in reactive pipeline |
| SCG + Custom Handler | Body-based routing + SSE transformation |
| OpenAI Compat Workers | Single SSE parser, unified interface |
| Tool Execution in Chat API | Domain logic stays out of Gateway |
| Standard SSE with `kind` | Extensible without new event types |

---

## Appendix A: Migration from Current Architecture

### Current State

```
React → ChatController (MVC) → ChatService → AIChatClient → Flask LLM Service
```

### Target State

```
React → ReactiveChatController (WebFlux) → ReactiveChatService → LlmGatewayClient → LLM Gateway → Workers
```

### Migration Steps

1. **Phase 1**: Add WebFlux endpoints alongside MVC (v2 API)
2. **Phase 2**: Migrate React to use v2 endpoints
3. **Phase 3**: Replace Flask LLM Service with Gateway + Workers
4. **Phase 4**: Deprecate MVC endpoints
5. **Phase 5**: Remove legacy code

### Backward Compatibility

- `/api/chat/*` endpoints remain functional during migration
- `/api/v2/chat/*` endpoints provide new functionality
- Feature flag to switch between implementations

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **SSE** | Server-Sent Events - HTTP streaming protocol |
| **TTFT** | Time To First Token - latency metric |
| **GGUF** | GPT-Generated Unified Format - quantized model format |
| **vLLM** | High-throughput LLM serving engine |
| **SCG** | Spring Cloud Gateway |
| **R2DBC** | Reactive Relational Database Connectivity |
| **Tool Calling** | LLM invoking external functions |
| **A/B Testing** | Comparing two engine outputs |
| **Circuit Breaker** | Fault tolerance pattern |

---

*Document Version: 1.0*
*Last Updated: 2026-01-29*
*Based on: GGUF-vLLM Interoperability Design Document*
