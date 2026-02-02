# PMS-IC LLM Service Architecture Analysis & Implementation Plan

## Executive Summary

Based on the PDF design document "GGUF/vLLM Interoperability LLM Service Redesign" and codebase analysis, the current implementation has achieved approximately **85% alignment** with the target architecture. The core streaming infrastructure, engine routing, and reactive patterns are fully implemented.

---

## 1. Current Implementation Status

### 1.1 Architecture Comparison

| Component | PDF Design | Current Status | Gap |
|-----------|------------|----------------|-----|
| **Chat API Service** | Spring WebFlux + R2DBC | ✅ Implemented | None |
| **LLM Gateway** | Spring Cloud Gateway (separate service) | ⚠️ Embedded in Chat API | Service separation needed |
| **GGUF Worker** | llama.cpp OpenAI compat | ✅ Flask + llama-cpp-python | Minor endpoint alignment |
| **vLLM Worker** | OpenAI compat /v1/chat/completions | ❌ Not deployed | Docker service needed |
| **Standard SSE Events** | meta/delta/done/error | ✅ Implemented | None |
| **Engine Routing** | gguf/vllm/auto/ab | ✅ Implemented | None |
| **Tool Calling** | Chat API orchestration loop | ⚠️ Infrastructure ready | Orchestration loop incomplete |
| **A/B Testing** | Shadow engine collection | ✅ Implemented | None |
| **R2DBC Persistence** | PostgreSQL reactive | ✅ Implemented | None |
| **Health Checking** | Circuit breaker + metrics | ✅ Implemented | None |

### 1.2 Implemented Components (Detailed)

#### Chat API Service (Spring WebFlux)
- **Location**: `PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/chat/`
- **Controller**: `ReactiveChatController.java`
  - `POST /api/v2/chat/stream` - SSE streaming endpoint
  - `POST /api/v2/chat/message` - Non-streaming endpoint
  - Health endpoints for engine status
- **Service**: `ReactiveChatService.java`
  - Message persistence (R2DBC)
  - Session management
  - Gateway integration

#### LLM Gateway (Embedded)
- **Location**: `chat/gateway/`
- **Components**:
  - `LlmGatewayService.java` - Core gateway logic
  - `EngineRouter.java` - Engine selection (auto/ab/explicit)
  - `HealthChecker.java` - Health status with circuit breaker
  - `OpenAiSseTransformer.java` - OpenAI SSE → Standard SSE

#### Standard SSE Contract
- **Location**: `chat/dto/sse/`
- **Events**: meta, delta, done, error
- **Delta kinds**: TEXT, TOOL_CALL, JSON

#### R2DBC Entities & Repositories
- **Entities**: `R2dbcChatSession.java`, `R2dbcChatMessage.java`
- **Schema**: `chat.chat_sessions`, `chat.chat_messages`
- **Repositories**: Reactive CRUD with custom queries

#### Tool Calling Infrastructure
- **Location**: `chat/tool/`
- **Components**:
  - `ToolOrchestrator.java` - Tool execution coordination
  - `ToolRegistry.java` - Tool registration
  - `ToolExecutor.java` - Execution interface
  - `impl/GetProjectStatusTool.java` - Example implementation

---

## 2. Gap Analysis

### 2.1 Critical Gaps (High Priority)

#### Gap #1: vLLM Worker Service Not Deployed
- **Current**: Only GGUF worker (llm-service) exists
- **Target**: Separate vLLM service with OpenAI compat API
- **Impact**: Cannot use vLLM engine for tool calling/high throughput
- **Effort**: Medium (Docker config + environment setup)

```yaml
# Missing: docker-compose.vllm.yml
services:
  vllm-service:
    image: vllm/vllm-openai:latest
    ports: ["8001:8000"]
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

#### Gap #2: Tool Calling Orchestration Loop Incomplete
- **Current**: Tool infrastructure exists but no stream-interrupt-resume loop
- **Target**: Chat API detects `tool_call`, executes, re-invokes LLM with result
- **Impact**: Tool calling only works in non-streaming mode
- **Effort**: High (Complex Flux composition)

**Required Flow**:
```
1. Stream from Gateway
2. Detect delta(kind=tool_call)
3. Interrupt stream, execute tool
4. Append tool result to messages
5. Re-invoke Gateway with updated messages
6. Merge new stream to original
```

#### Gap #3: Gateway Not Separated as Standalone Service
- **Current**: Gateway logic embedded in Chat API
- **Target**: Spring Cloud Gateway as separate deployment
- **Impact**: Tight coupling, can't scale independently
- **Effort**: High (New Spring Boot project + migration)

### 2.2 Medium Priority Gaps

#### Gap #4: GGUF Worker Endpoint Alignment
- **Current**: Flask `/api/chat/v2/stream` with custom format
- **Target**: OpenAI compat `/v1/chat/completions`
- **Impact**: Gateway needs two parsers (OpenAI + legacy)
- **Effort**: Low (Add new route or alias)

#### Gap #5: Configuration Harmonization
- **Current**: Mix of environment variables and hardcoded values
- **Target**: Unified configuration via application.yml + profiles
- **Effort**: Low

### 2.3 Low Priority / Future Enhancements

#### Gap #6: JSON Schema Response Format
- **Current**: Basic support
- **Target**: Full `response_format: {type: "json_schema"}` support
- **Effort**: Low (vLLM already supports, add pass-through)

#### Gap #7: Observability Enhancements
- **Current**: Basic Micrometer metrics
- **Target**: Full traceId propagation, distributed tracing
- **Effort**: Medium

---

## 3. Implementation Roadmap

### Phase 1: vLLM Worker Deployment (1-2 days)
**Goal**: Enable vLLM engine for production use

1. **Task 1.1**: Create `docker-compose.vllm.yml`
   - vLLM service definition
   - GPU allocation
   - Model mounting
   - Environment variables

2. **Task 1.2**: Update `application.yml` for vLLM
   ```yaml
   llm.workers.vllm:
     url: http://vllm-service:8000
     enabled: true
     model: Qwen/Qwen2.5-7B-Instruct
   ```

3. **Task 1.3**: Verify OpenAI compat endpoint
   - Test `/v1/chat/completions` with stream=true
   - Verify tool calling support

### Phase 2: Tool Calling Orchestration (3-5 days)
**Goal**: Complete streaming tool calling loop

1. **Task 2.1**: Enhance `OpenAiSseTransformer`
   - Detect `finish_reason: tool_calls`
   - Parse `tool_calls` from delta
   - Signal tool completion event

2. **Task 2.2**: Implement `ToolCallingOrchestrator`
   ```java
   public Flux<ServerSentEvent<String>> streamWithTools(
       GatewayRequest request,
       ToolContext context
   ) {
       return Flux.defer(() -> streamOneTurn(request))
           .expand(turn -> {
               if (turn.hasToolCall()) {
                   return executeTool(turn)
                       .flatMapMany(result -> streamOneTurn(
                           appendToolResult(request, result)
                       ));
               }
               return Flux.empty();
           });
   }
   ```

3. **Task 2.3**: Integrate with `ReactiveChatService`
   - Wire tool orchestrator into stream pipeline
   - Handle tool execution errors
   - Persist tool call audit logs

### Phase 3: GGUF Worker OpenAI Compat (1 day)
**Goal**: Unified endpoint format across workers

1. **Task 3.1**: Add OpenAI compat route to llm-service
   ```python
   @app.route('/v1/chat/completions', methods=['POST'])
   def openai_chat_completions():
       # Transform to internal format
       # Stream SSE in OpenAI format
   ```

2. **Task 3.2**: Update Gateway to use unified endpoint
   - Remove legacy format handling (optional)
   - Single `OpenAiSseTransformer` for both engines

### Phase 4: Gateway Service Separation (Optional, 5-7 days)
**Goal**: Deploy Gateway as standalone Spring Cloud Gateway

1. **Task 4.1**: Create new module `pms-llm-gateway`
   - Spring Cloud Gateway dependency
   - Route configuration
   - Custom filters

2. **Task 4.2**: Migrate gateway components
   - `LlmGatewayService` → Gateway filter
   - `EngineRouter` → Route predicate
   - `HealthChecker` → Actuator endpoints

3. **Task 4.3**: Update Chat API
   - Remove embedded gateway
   - Configure WebClient to call Gateway service
   - Update Docker compose

### Phase 5: Production Hardening (2-3 days)
**Goal**: Operational readiness

1. **Task 5.1**: Enhanced timeout configuration
   - TTFT timeout: 15s
   - Total timeout: 120s (chat), 300s (reports)
   - Per-engine timeout overrides

2. **Task 5.2**: Circuit breaker tuning
   - Failure rate threshold: 50%
   - Slow call rate threshold: 80%
   - Wait duration: 30s

3. **Task 5.3**: Rate limiting
   - GGUF: 2 concurrent requests
   - vLLM: 10 concurrent requests
   - Per-user limits

---

## 4. Implementation Priority Matrix

| Task | Priority | Effort | Dependencies | Recommended Order |
|------|----------|--------|--------------|-------------------|
| vLLM Worker Deployment | HIGH | Medium | None | 1 |
| Tool Calling Orchestration | HIGH | High | vLLM preferred | 2 |
| GGUF OpenAI Compat | MEDIUM | Low | None | 3 |
| Gateway Separation | LOW | High | All above | 4 (Optional) |
| Production Hardening | MEDIUM | Medium | 1-3 | 5 |

---

## 5. Configuration Reference

### Current application.yml (LLM section)
```yaml
llm:
  workers:
    vllm:
      url: ${VLLM_WORKER_URL:http://localhost:8000}
      enabled: ${VLLM_ENABLED:false}
      model: qwen3-8b
    gguf:
      url: ${GGUF_WORKER_URL:http://localhost:8080}
      enabled: ${GGUF_ENABLED:true}
      model: gemma-3-12b
    default: gguf
  gateway:
    timeout:
      total: 120
      ttft: 15
  routing:
    context-threshold: 4096
    tools-prefer-vllm: true
  health:
    check-interval: 10000
```

### Target application.yml additions
```yaml
llm:
  workers:
    vllm:
      enabled: ${VLLM_ENABLED:true}  # Enable by default
      tool-calling: true
      json-schema: true
  gateway:
    timeout:
      report: 300  # Longer for reports
    concurrent:
      gguf: 2
      vllm: 10
  circuit-breaker:
    failure-rate-threshold: 50
    slow-call-threshold: 80
    wait-duration: 30s
```

---

## 6. File Locations Reference

### Backend (Java)
| Component | Path |
|-----------|------|
| Controller | `PMS_IC_BackEnd_v1.2/.../chat/controller/ReactiveChatController.java` |
| Service | `PMS_IC_BackEnd_v1.2/.../chat/service/ReactiveChatService.java` |
| Gateway | `PMS_IC_BackEnd_v1.2/.../chat/gateway/LlmGatewayService.java` |
| Engine Router | `PMS_IC_BackEnd_v1.2/.../chat/gateway/EngineRouter.java` |
| SSE Events | `PMS_IC_BackEnd_v1.2/.../chat/dto/sse/` |
| Tools | `PMS_IC_BackEnd_v1.2/.../chat/tool/` |
| R2DBC Entities | `PMS_IC_BackEnd_v1.2/.../chat/reactive/entity/` |
| Config | `PMS_IC_BackEnd_v1.2/src/main/resources/application.yml` |

### LLM Service (Python)
| Component | Path |
|-----------|------|
| App Entry | `llm-service/app.py` |
| Chat Routes | `llm-service/routes/chat_routes.py` |
| Model Gateway | `llm-service/model_gateway.py` |

### Docker
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base configuration |
| `docker-compose.gpu.yml` | GPU profile |
| `docker-compose.prod.yml` | Production profile |
| `docker-compose.vllm.yml` | **To be created** |

---

## 7. Quick Start Commands

### Development
```bash
# Start with GGUF only
docker-compose up -d postgres redis neo4j backend frontend llm-service

# Start with vLLM (after Phase 1)
docker-compose -f docker-compose.yml -f docker-compose.vllm.yml up -d
```

### Testing Engine Selection
```bash
# Test GGUF
curl -X POST http://localhost:8083/api/v2/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "engine": "gguf"}'

# Test vLLM (after Phase 1)
curl -X POST http://localhost:8083/api/v2/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "engine": "vllm"}'

# Test auto routing
curl -X POST http://localhost:8083/api/v2/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "engine": "auto"}'
```

---

## 8. Conclusion

The current implementation closely follows the PDF design with solid foundations:
- ✅ WebFlux reactive architecture
- ✅ Standard SSE event contract
- ✅ Engine routing with health awareness
- ✅ R2DBC persistence
- ✅ A/B testing infrastructure

**Immediate priorities**:
1. Deploy vLLM worker for tool calling and high-throughput scenarios
2. Complete tool calling orchestration loop for streaming mode
3. Harmonize GGUF worker to OpenAI compat format

The Gateway separation (Phase 4) is optional and can be deferred based on scaling requirements.
