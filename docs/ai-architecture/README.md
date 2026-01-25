# AI-PMS Architecture Implementation Roadmap

## 개요

PMS-IC 프로젝트의 AI 시스템을 "챗봇"에서 "제품화된 AI 플랫폼"으로 진화시키기 위한 단계별 구현 계획입니다.

> 📊 **현재 구현 상태**: [implementation-status.md](./implementation-status.md) - 실제 코드베이스와 문서화된 아키텍처 간 비교 분석

## 현재 구현 진행률 요약

| 영역 | 진행률 | 상태 |
|------|--------|------|
| **Frontend** | 62% | 16/26 페이지 구현, 10개 placeholder |
| **Backend API** | 95% | 38 controllers, 150+ endpoints 완료 |
| **Database Schema** | 95% | 58 tables, chat schema 구현됨, risk schema 미구현 |
| **LLM Service** | ✅ 100% | Two-Track workflow + Phase 1-3 완료 |
| **Neo4j Sync** | 100% | 12 node types, 17 relationships |
| **Phase 1 (Gates)** | ✅ 100% | Authority Gate, Evidence System, Failure Taxonomy 구현 완료 |
| **Phase 2 (Workflow)** | ✅ 100% | LangGraph Templates (G1-G5), Skill Library (10), Observability 구현 완료 |
| **Phase 3 (Product)** | ✅ 100% | Subagent Pool (6), MCP Gateway/Registry, Value Metrics, Lifecycle 구현 완료 |

---

## 현재 시스템 아키텍처 (실제 구현)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 18 + TypeScript)            │
├─────────────────────────────────────────────────────────────────────┤
│  9-Zone UI Framework                                                │
│  ├── 16 Implemented Pages (Dashboard, Projects, Phases, Backlog...) │
│  ├── 10 Placeholder Pages (Testing, Issues, Statistics...)          │
│  ├── 23 API Hooks (useProjects, usePhases, useWbs, useChat...)      │
│  └── 2 Zustand Stores (authStore, uiStore)                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Spring Boot 3.2)                   │
├─────────────────────────────────────────────────────────────────────┤
│  38 Controllers │ 80+ Entities │ 40+ Services │ 150+ Endpoints     │
│  ├── auth: User, Permission, RBAC                                  │
│  ├── project: Project, Phase, WBS, Deliverable, Requirement, RFP   │
│  ├── task: Task, Sprint, UserStory, Backlog, KanbanColumn         │
│  └── report: Report, ReportTemplate, WeeklyReport                  │
└─────────┬──────────────────────────────────────┬────────────────────┘
          │ JPA                                  │ HTTP
          ▼                                      ▼
┌─────────────────────────┐     ┌────────────────────────────────────┐
│  PostgreSQL 15          │     │  LLM Service (Flask + LangGraph)   │
│  ├── auth (3 tables)    │     ├────────────────────────────────────┤
│  ├── project (31 tables)│     │  Two-Track Workflow                │
│  ├── task (7 tables)    │     │  ├── Track A: Fast (LFM2-2.6B)     │
│  ├── report (13 tables) │     │  └── Track B: Quality (Gemma-12B)  │
│  ├── chat (scaffolded)  │     │  Policy Engine (L0 enforcement)    │
│  └── risk (scaffolded)  │     │  Hybrid RAG (Vector + Keyword)     │
│  Total: 54 tables       │     │  Context Snapshot (Now/Next/Why)   │
└─────────────────────────┘     └────────────────┬───────────────────┘
                                                 │ Cypher
                                                 ▼
                               ┌─────────────────────────────────────┐
                               │  Neo4j 5.20                         │
                               │  ├── 12 Node Types                  │
                               │  │   (Project, Sprint, Task, Story, │
                               │  │    Phase, Epic, Feature, WBS...) │
                               │  ├── 17 Relationship Types          │
                               │  └── Vector Index (RAG embeddings)  │
                               └─────────────────────────────────────┘
```

### 핵심 구현 현황

| 레이어 | 구현 상태 | 주요 기능 |
|--------|-----------|-----------|
| **UI Layer** | ✅ 62% | 9-Zone 메뉴, Role-based 접근제어, Mock fallback |
| **API Layer** | ✅ 95% | JWT 인증, 150+ REST endpoints, WebSocket (WIP) |
| **Data Layer** | ✅ 90% | 6 schemas, Flyway migrations, Outbox pattern |
| **AI Layer** | ✅ 95% | Two-Track LangGraph, Policy Engine, GraphRAG, Skills, Observability |
| **Graph Layer** | ✅ 100% | PG→Neo4j 동기화, Lineage tracking |

---

## 현재 상태 vs 목표 아키텍처

```
현재                                    목표
─────                                  ─────
┌─────────────────┐                   ┌─────────────────────────────────────┐
│  Chat UI        │                   │  Product Surface Layer               │
│  (Basic Q&A)    │                   │  (9-Zone UI + Chat Copilot)          │
└────────┬────────┘                   └──────────────┬──────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────┐                   ┌─────────────────────────────────────┐
│  Intent         │                   │  Product Orchestration Layer         │
│  Classification │                   │  (Router + 4 Gates + Policy)         │
└────────┬────────┘                   └──────────────┬──────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────┐                   ┌─────────────────────────────────────┐
│  RAG Search     │                   │  MCP Runtime Layer                   │
│  (Basic)        │                   │  (Gateway + Registry + Observability)│
└────────┬────────┘                   └──────────────┬──────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────┐                   ┌─────────────────────────────────────┐
│  LLM Response   │                   │  Skill & Agent Layer                 │
│  Generation     │                   │  (Subagent Pool + Skill Library)     │
└─────────────────┘                   └──────────────┬──────────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────────────┐
                                      │  Workflow Layer (LangGraph)          │
                                      │  (Templates + Node Types + Recovery) │
                                      └──────────────┬──────────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────────────┐
                                      │  Topology & Ontology Layer           │
                                      │  (Knowledge Graph + Domain Model)    │
                                      └─────────────────────────────────────┘
```

## 구현 Phase 요약

| Phase | 주요 목표 | 핵심 결과물 | 예상 기간 |
|-------|----------|------------|----------|
| **Phase 1** | 안전장치(Gates) 추가 | Decision Authority Gate, Evidence System, Failure Taxonomy | 2-3주 |
| **Phase 2** | 워크플로우/스킬 분리 | LangGraph Templates (5개 G1-G5), Skill Library (10), Observability | ✅ 완료 |
| **Phase 3** | 제품화 | Subagent Pool (6개), MCP Gateway, Value Metrics, Lifecycle Management | ✅ 완료 |

## Phase 1: Gates & Foundation

> 📄 상세 문서: [phase1-gates-and-foundation.md](./phase1-gates-and-foundation.md)

### 목표
현재 구조 위에 AI 안전장치를 추가하여 "제어된 AI 시스템"으로 전환

### 핵심 구성요소

| 구성요소 | 설명 | 파일 |
|---------|------|------|
| **Decision Authority Gate** | AI 응답을 SUGGEST/DECIDE/EXECUTE/COMMIT 4단계로 분류 | `authority_classifier.py` |
| **Evidence Linking** | AI 응답에 근거(출처) 필수 연결 | `evidence_service.py` |
| **Failure Taxonomy** | 실패 유형 분류 및 복구 전략 | `failure_taxonomy.py` |
| **Response Schema** | 표준화된 AI 응답 포맷 | `schemas/ai_response.py` |

### 주요 효과
- AI가 무분별하게 시스템을 변경하지 못함 (COMMIT은 승인 필요)
- 모든 AI 응답에 근거가 포함되어 검증 가능
- 실패 시 체계적인 복구 가능

---

## Phase 2: Workflow & Skills

> 📄 상세 문서: [phase2-workflow-and-skills.md](./phase2-workflow-and-skills.md)

### 목표
LangGraph 워크플로우를 템플릿화하고 재사용 가능한 Skill Library 구축

### 핵심 구성요소

#### 워크플로우 템플릿 (5개) ✅ 구현 완료

| 템플릿 | 용도 | 파일 |
|--------|------|------|
| **G1 Weekly Report** | 주간 보고서 자동 생성 | `workflows/g1_weekly_report.py` |
| **G2 Sprint Planning** | 스프린트 범위 추천 (WSJF) | `workflows/g2_sprint_planning.py` |
| **G3 Traceability** | 요구사항-백로그 정합성 점검 | `workflows/g3_traceability.py` |
| **G4 Risk Radar** | 리스크 및 영향도 분석 | `workflows/g4_risk_radar.py` |
| **G5 Knowledge QA** | 프로젝트 지식 Q&A | `workflows/g5_knowledge_qa.py` |

#### Skill Library (10 Skills) ✅ 구현 완료

| Category | Skills | 파일 |
|----------|--------|------|
| **Retrieve** | `RetrieveDocsSkill`, `RetrieveGraphSkill`, `RetrieveMetricsSkill` | `skills/retrieve_skills.py` |
| **Analyze** | `AnalyzeRiskSkill`, `AnalyzeDependencySkill`, `AnalyzeSentimentSkill` | `skills/analyze_skills.py` |
| **Generate** | `GenerateSummarySkill`, `GenerateReportSkill` | `skills/generate_skills.py` |
| **Validate** | `ValidateEvidenceSkill`, `ValidatePolicySkill` | `skills/validate_skills.py` |

#### Basic Observability ✅ 구현 완료

| 구성요소 | 역할 | 파일 |
|---------|------|------|
| **Tracer** | OpenTelemetry-compatible tracing, Span/SpanContext | `observability/tracing.py` |
| **Metrics Collector** | Counter, Gauge, Histogram (Prometheus-compatible) | `observability/metrics.py` |
| **Skill Registry** | Skill discovery, execution, chaining | `skills/registry.py` |

---

## Phase 3: Productization

> 📄 상세 문서: [phase3-productization.md](./phase3-productization.md)

### 목표
AI 시스템을 "제품"으로 전환: 역할별 에이전트 분리, 도구 표준화, 비즈니스 가치 측정

### 핵심 구성요소

#### Subagent Pool (6개)

| Agent | 역할 | 최대 권한 |
|-------|------|----------|
| **Orchestrator** | 요청 라우팅 및 에이전트 조율 | DECIDE |
| **Planner** | 일정/범위/의존성 계획 | SUGGEST |
| **Scrum Master** | 스프린트/속도/블로커 관리 | EXECUTE |
| **Reporter** | 보고서 생성/요약 | EXECUTE |
| **Knowledge Curator** | 문서 큐레이션/결정 연결 | SUGGEST |
| **Risk/Quality** | 누락/충돌/품질 점검 | SUGGEST |

#### MCP Gateway & Registry

```
[Agent] → [MCP Gateway] → [MCP Registry] → [Tool]
               │
               ├── Rate Limiting
               ├── Secret Management
               ├── Tenant Isolation
               ├── Cost Tracking
               └── Observability
```

**MCP Registry 6 Entities:**

| Entity | 역할 |
|--------|------|
| **mcp_package** | 도구 패키지 정의 |
| **mcp_version** | 패키지 버전 관리 |
| **mcp_capability** | 도구 기능 정의 |
| **mcp_policy** | 사용 정책 (rate_limit, access_control, data_scope, audit) |
| **mcp_sla** | 서비스 수준 계약 |
| **mcp_telemetry** | 호출 메트릭/텔레메트리 |

#### Traceability Rules (T1-T6)

| Rule | 이름 | 목적 |
|------|------|------|
| **T1** | Requirement Coverage | 모든 요구사항이 백로그로 연결 |
| **T2** | Orphan Detection | 연결 없는 고아 항목 감지 |
| **T3** | WBS Alignment | WBS와 백로그 정합성 |
| **T4** | Dependency Consistency | 의존성 일관성 검증 |
| **T5** | Decision Audit | 의사결정 이력 감사 |
| **T6** | Evidence Grounding | 근거 기반 검증 |

#### Value Metrics System

| Category | Metrics |
|----------|---------|
| **Efficiency** | 보고서 작성 시간 절감, 계획 시간 절감 |
| **Quality** | 이슈 감지율, 오탐률, 추적성 점수 |
| **Adoption** | AI 응답 채택률, 인간 개입률, 에스컬레이션률 |
| **Cost** | 보고서당 비용, 토큰 효율 |

---

## 의존성 그래프

```
                    ┌─────────────────┐
                    │    Phase 3      │
                    │ (Productization)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐
      │ Subagent  │  │    MCP    │  │   Value   │
      │   Pool    │  │  Gateway  │  │  Metrics  │
      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────┴──────┐
                    │   Phase 2   │
                    │ (Workflow & │
                    │   Skills)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
      ┌───────────┐ ┌───────────┐ ┌───────────┐
      │ LangGraph │ │   Skill   │ │  Basic    │
      │ Templates │ │  Library  │ │Observabil.│
      └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
            │             │             │
            └─────────────┼─────────────┘
                          │
                   ┌──────┴──────┐
                   │   Phase 1   │
                   │  (Gates &   │
                   │ Foundation) │
                   └──────┬──────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐
    │ Decision  │ │ Evidence  │ │ Failure   │
    │ Authority │ │  System   │ │ Taxonomy  │
    └───────────┘ └───────────┘ └───────────┘
```

---

## 4대 Gate 요약

AI 시스템의 안전과 품질을 보장하는 핵심 게이트:

| Gate | 역할 | 구현 Phase |
|------|------|-----------|
| **Decision Authority Gate** | AI 액션의 권한 수준 결정 (SUGGEST→COMMIT) | Phase 1 |
| **Semantic Lifecycle Gate** | 리소스 버전/유효범위 관리 | Phase 3 |
| **Failure & Recovery Gate** | 실패 분류 및 복구 경로 강제 | Phase 1 |
| **Value Metric Gate** | 비즈니스 가치 측정 | Phase 3 |

---

## 파일 구조 (목표)

```
llm-service/
├── agents/
│   ├── __init__.py
│   ├── base_agent.py
│   ├── orchestrator_agent.py
│   ├── planner_agent.py
│   ├── scrum_master_agent.py
│   ├── reporter_agent.py
│   ├── knowledge_curator_agent.py
│   └── risk_quality_agent.py
├── skills/
│   ├── __init__.py
│   ├── registry.py
│   ├── retrieve_skills.py
│   ├── analyze_skills.py
│   ├── generate_skills.py
│   └── validate_skills.py
├── workflows/
│   ├── __init__.py
│   ├── base_state.py
│   ├── weekly_report_workflow.py
│   ├── sprint_planning_workflow.py
│   └── traceability_workflow.py
├── mcp/
│   ├── __init__.py
│   ├── tool_definition.py
│   ├── registry.py
│   ├── gateway.py
│   └── tools/
│       ├── database_tools.py
│       ├── llm_tools.py
│       └── external_tools.py
├── observability/
│   ├── __init__.py
│   ├── tracing.py
│   └── metrics.py
├── value_metrics/
│   ├── __init__.py
│   └── collector.py
├── lifecycle/
│   ├── __init__.py
│   └── manager.py
├── schemas/
│   ├── __init__.py
│   └── ai_response.py
├── authority_classifier.py
├── evidence_service.py
├── failure_taxonomy.py
└── chat_workflow_v2.py  (기존 파일 확장)
```

---

## 구현 완료 현황

### Phase 1: Gates & Foundation ✅ 완료

- `authority_classifier.py` - 4단계 권한 분류
- `schemas/ai_response.py` - 표준 응답 스키마
- `evidence_service.py` - 근거 추출 서비스
- `failure_taxonomy.py` - 16개 실패 코드 및 복구
- `chat_workflow_v2.py` Gate 통합
- DB Migration (`V20260130__ai_response_logging.sql`)
- Frontend 승인 UI (`ApprovalDialog.tsx`, `EvidencePanel.tsx`)

### Phase 2: Workflow & Skills ✅ 완료

- `skills/` - 10개 Skill (Retrieve 3, Analyze 3, Generate 2, Validate 2)
- `skills/registry.py` - Skill 등록/발견/체이닝
- `workflows/` - 5개 LangGraph 템플릿 (G1-G5)
- `workflows/common_state.py` - CommonWorkflowState
- `workflows/common_nodes.py` - 9개 표준 노드 타입
- `observability/` - Tracing + Metrics (OpenTelemetry/Prometheus 호환)

### Phase 3: Productization ✅ 완료

- `agents/` - 6개 역할 기반 에이전트
- `mcp/gateway.py` - Rate limiting, Access control, Telemetry
- `mcp/registry.py` - Tool 등록/버전/발견
- `mcp/tools/` - 9개 도구 (Database 5, LLM 4)
- `value_metrics/` - 효율성/품질/채택률/비용 메트릭
- `lifecycle/` - 시맨틱 버전, 상태 머신, 폐기 관리

---

## 성공 지표

| 지표 | 목표 | 현재 상태 |
|------|------|----------|
| AI 응답에 근거 포함률 | 98%+ | ✅ 구현 완료 (Evidence System) |
| COMMIT 전 승인률 | 100% | ✅ 구현 완료 (Authority Gate) |
| 실패 복구 성공률 | 90%+ | ✅ 구현 완료 (Failure Taxonomy) |
| 주간보고 자동화율 | 90%+ | ✅ 구현 완료 (G1 Workflow) |
| AI 응답 채택률 | 70%+ | ✅ 측정 가능 (Value Metrics) |

---

## 참고 자료

- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Anthropic Claude Best Practices](https://docs.anthropic.com/claude/docs)

---

*Last Updated: 2026-01-26*
