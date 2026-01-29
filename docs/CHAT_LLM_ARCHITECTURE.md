# Chat & LLM Architecture Summary

## 1. SSE Endpoint Status

**Current Status: SSE IMPLEMENTED (v2 API)**

Both MVC and WebFlux endpoints are available. The v2 API provides SSE streaming support.

### Legacy Chat Endpoints (MVC - `/api/chat`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/message` | POST | Send message to AI chatbot |
| `/api/chat/history/{sessionId}` | GET | Get conversation history |
| `/api/chat/session/{sessionId}` | DELETE | Delete chat session |

### Reactive Chat Endpoints (WebFlux - `/api/v2/chat`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/chat/stream` | POST | SSE streaming chat response |
| `/api/v2/chat/message` | POST | Non-streaming reactive chat |
| `/api/v2/chat/history/{sessionId}` | GET | Get conversation history (reactive) |
| `/api/v2/chat/session/{sessionId}` | DELETE | Delete session (reactive) |
| `/api/v2/chat/health/stream` | GET | SSE health check test |

---

## 2. LLM Call Flow

### Spring Boot → LLM Service Communication

```
React (Frontend)
    │
    ▼ POST /api/chat/message
┌──────────────────────────────────────────────────────────────┐
│ ChatController.java                                          │
│ Package: com.insuretech.pms.chat.controller                 │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ ChatService.java                                             │
│ Package: com.insuretech.pms.chat.service                    │
│ - Session management                                         │
│ - Message persistence (PostgreSQL)                          │
│ - Redis caching                                              │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ AIChatClient.java                                            │
│ Package: com.insuretech.pms.chat.service                    │
│ - WebClient-based HTTP client                               │
│ - Calls LLM service via REST                                │
│ - Fallback to mock service on failure                       │
└──────────────────────────────────────────────────────────────┘
    │
    ▼ POST ${ai.service.url}/api/chat/v2
┌──────────────────────────────────────────────────────────────┐
│ LLM Service (Flask)                                          │
│ URL: http://llm-service:8000                                │
│ Port: 8000                                                   │
└──────────────────────────────────────────────────────────────┘
```

### Key Service Classes

| Class | Package | Role |
|-------|---------|------|
| `ChatController` | `com.insuretech.pms.chat.controller` | REST API endpoints |
| `ChatService` | `com.insuretech.pms.chat.service` | Business logic, session management |
| `AIChatClient` | `com.insuretech.pms.chat.service` | HTTP client to LLM service |
| `LlmService` | `com.insuretech.pms.chat.service` | Model/OCR config management |
| `LlmController` | `com.insuretech.pms.chat.controller` | Model admin endpoints |

### LLM Service Endpoints (Called by Spring)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/v2` | POST | Main chat endpoint |
| `/api/model/current` | GET | Get current model info |
| `/api/model/change` | PUT | Change LLM model |
| `/api/model/lightweight` | GET/PUT | Lightweight model config |
| `/api/model/medium` | GET/PUT | Medium model config |
| `/api/ocr/current` | GET | Get OCR engine config |
| `/api/ocr/change` | PUT | Change OCR engine |
| `/health` | GET | Health check |

---

## 3. Configuration

### application.yml Properties

```yaml
ai:
  service:
    url: ${AI_SERVICE_URL:http://llm-service:8000}
    mock-url: ${AI_MOCK_URL:http://localhost:8001}
    model: ${AI_MODEL:llama3}
```

---

## 4. Request/Response Format

### Chat Request (AIChatClient → LLM Service)

```json
{
  "message": "User message",
  "context": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "retrieved_docs": [],
  "user_id": "user123",
  "project_id": "project456",
  "user_role": "PM",
  "user_access_level": 3
}
```

### Chat Response

```json
{
  "reply": "AI response text",
  "confidence": 0.95,
  "suggestions": ["suggestion1", "suggestion2"]
}
```

---

## 5. Notes for SSE Implementation

If SSE streaming is needed, the following changes would be required:

1. **Spring Boot**: Add `SseEmitter` or `Flux<ServerSentEvent>` based streaming endpoint
2. **AIChatClient**: Use `WebClient.exchangeToFlux()` for streaming responses
3. **LLM Service**: Implement streaming response in Flask (generator-based)
4. **Frontend**: Use `EventSource` API or fetch with `ReadableStream`
