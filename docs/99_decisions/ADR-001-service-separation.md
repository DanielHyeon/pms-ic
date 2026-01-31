# ADR-001: Backend and LLM Service Separation

## Status

**Accepted** | 2026-01-31

---

## Context

The system needs both traditional CRUD operations (project management) and AI-powered features (chat, RAG). We needed to decide whether to:
1. Build everything in a single service
2. Separate AI/LLM functionality into a dedicated service

---

## Considered Options

### Option A: Monolithic Service

All functionality in Spring Boot backend.

**Pros:**
- Simpler deployment
- No network overhead
- Single codebase

**Cons:**
- Java ecosystem limited for ML
- Resource contention (CPU/GPU vs I/O)
- Harder to scale independently
- LLM failures affect entire system

### Option B: Separate LLM Service (Chosen)

Backend in Spring Boot, LLM in Python/Flask.

**Pros:**
- Python ML ecosystem (LangGraph, llama-cpp)
- Independent scaling (GPU for LLM, I/O for backend)
- Failure isolation
- Team specialization possible

**Cons:**
- Network latency
- Operational complexity
- Need for service discovery

### Option C: External LLM API Only

Use only external APIs (OpenAI, Claude).

**Pros:**
- No infrastructure management
- Always latest models

**Cons:**
- Cost at scale
- Data privacy concerns
- Vendor lock-in
- Latency for on-premise requirements

---

## Decision

**Option B: Separate LLM Service**

We chose to separate the LLM functionality into a dedicated Python service (Flask + LangGraph) while keeping the main backend in Spring Boot.

---

## Rationale

1. **Technology fit**: Python has better ML/LLM ecosystem (LangGraph, sentence-transformers, llama-cpp)

2. **Resource isolation**: LLM inference is CPU/GPU intensive; backend is I/O bound. Separating allows optimal resource allocation.

3. **Failure isolation**: LLM failures (OOM, model issues) don't crash the main backend. Users can still access non-AI features.

4. **Scalability**: Can scale LLM service independently based on demand.

5. **Team structure**: Different skill sets can work independently.

---

## Consequences

### Positive

- Clean separation of concerns
- Easier to swap LLM implementations
- Better resource utilization
- Graceful degradation possible

### Negative

- Additional network hop (mitigated with SSE streaming)
- Deployment complexity (mitigated with Docker Compose)
- Need for health checks and circuit breakers

### Risks

- Service discovery in production
- Latency for real-time features
- Operational monitoring overhead

---

## Review Conditions

Revisit this decision if:

- LLM inference becomes cheap enough for managed APIs
- Java gets mature LLM libraries
- Latency requirements become stricter
- Team structure changes significantly

---

## Evidence

- Implementation: `docker-compose.yml` (separate services)
- LLM Service: `llm-service/` directory
- Circuit Breaker: `LlmGatewayService.java`

---

*Decision made by: Architecture Team*
*Date: 2026-01-31*
