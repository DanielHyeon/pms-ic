# 시스템 아키텍처

> **버전**: 2.1 | **상태**: Final | **최종 수정일**: 2026-02-02

---

## 이 문서가 답하는 질문

- 시스템은 어떻게 구성되어 있는가?
- 왜 서비스가 이렇게 분리되어 있는가?
- 장애는 어디에서 격리되는가?
- 동기/비동기 경계는 어디인가?

---

## 1. 아키텍처 문서

| 문서 | 목적 |
|----------|---------|
| [system_overview.md](./system_overview.md) | 고수준 시스템 구조 |
| [service_boundaries.md](./service_boundaries.md) | 서비스 분리 근거 |

---

## 2. 기술 스택 요약

### 기술 스택

| 계층 | 기술 | 버전 |
|-------|------------|---------|
| **Frontend** | React + TypeScript + Vite | React 18, Vite 5 |
| **Backend** | Spring Boot + WebFlux + R2DBC | Spring Boot 3.2, Java 21 |
| **LLM Service** | Flask + LangGraph | Python 3.11 |
| **Database** | PostgreSQL | 17-alpine |
| **Graph DB** | Neo4j | 2025.01.0-community |
| **Cache** | Redis | 8-alpine |

### 서비스 포트

| 서비스 | 포트 | 용도 |
|---------|------|---------|
| Frontend | 5173 | React SPA |
| Backend | 8083 | Spring Boot API |
| LLM Service | 8000 | AI/LLM 처리 |
| PostgreSQL | 5433 | 주 데이터베이스 |
| Redis | 6379 | 캐시 및 세션 |
| Neo4j | 7687 (Bolt), 7474 (HTTP) | 그래프 데이터베이스 |
| PgAdmin | 5050 | PostgreSQL GUI |
| Redis Commander | 8082 | Redis GUI |

---

## 3. 시스템 다이어그램

```
                           ┌──────────────────────────────────┐
                           │       React SPA (5173)           │
                           │  Dashboard | Kanban | AI Chat    │
                           │  165 TSX | Zustand | TanStack    │
                           └────────────────┬─────────────────┘
                                           │ REST API + SSE
                           ┌────────────────▼─────────────────┐
                           │   Spring Boot Backend (8083)     │
                           │   ┌────────────────────────────┐ │
                           │   │ 32 Controllers             │ │
                           │   │ 45 R2DBC Entities          │ │
                           │   │ WebFlux + R2DBC            │ │
                           │   │ Project-Scoped RBAC        │ │
                           │   └────────────────────────────┘ │
                           └──────┬─────────────┬─────────────┘
                                  │ R2DBC       │ HTTP
          ┌───────────────────────┘             └──────────────────────┐
          ▼                                                            ▼
┌──────────────────────┐                              ┌────────────────────────────┐
│  PostgreSQL (5433)   │                              │   LLM Service (8000)       │
│  ├── auth (3 tables) │                              │   ┌──────────────────────┐ │
│  ├── project (31)    │                              │   │ Two-Track Workflow   │ │
│  ├── task (7)        │                              │   │ Text2Query Engine    │ │
│  ├── chat (4)        │                              │   │ 5 Workflows          │ │
│  ├── report (13)     │                              │   │ Hybrid RAG (RRF)     │ │
│  └── Total: 54+ tbl  │                              │   │ Query Validator      │ │
└──────────┬───────────┘                              │   └──────────────────────┘ │
           │ Outbox Pattern                           └─────────────┬──────────────┘
           ▼                                                        │ Cypher/SQL
┌──────────────────────┐                                            │
│    Neo4j (7687)      │◄───────────────────────────────────────────┘
│  ├── 12 Node Types   │
│  ├── 17 Relationship │
│  ├── Vector Index    │
│  └── Fulltext Index  │
└──────────────────────┘
```

---

## 4. 설계 원칙

### 결정 사항 (Decisions)

1. **서비스 분리**: Backend와 LLM은 별도 서비스
   - 근거: 다른 스케일링 요구사항, 장애 격리
   - 참조: [ADR-001](../99_decisions/ADR-001-service-separation.md)

2. **리액티브 스택**: Backend에 WebFlux + R2DBC 적용
   - 근거: 논블로킹 I/O로 더 나은 처리량

3. **Outbox 패턴**: PostgreSQL → Neo4j 동기화
   - 근거: 트랜잭션 일관성, 그래프는 최종 일관성
   - 참조: [ADR-002](../99_decisions/ADR-002-outbox-pattern.md)

4. **쿼리 검증**: AI 생성 쿼리에 4계층 보안 검증
   - 근거: SQL 인젝션 방지, 프로젝트 범위 강제
   - 참조: [ADR-005](../99_decisions/ADR-005-query-validation-security.md)

### 금지 사항 (Prohibited)

- Backend에서 Neo4j 직접 쓰기 (Outbox 사용)
- 중요 경로에서 Backend → LLM 동기 호출
- 서비스 간 데이터베이스 연결 공유
- LLM Service에서 PostgreSQL 직접 접근

---

## 5. 컴포넌트 책임

| 컴포넌트 | 책임 | 하지 않는 것 |
|-----------|---------------|-------------|
| **Frontend** | UI 렌더링, 상태 관리 | 비즈니스 로직, 직접 DB 접근 |
| **Backend** | 비즈니스 로직, 인가 | LLM 추론, 그래프 탐색 |
| **LLM Service** | AI 추론, RAG 검색, Text2Query | 데이터 영속화, 인가 결정 |
| **PostgreSQL** | 트랜잭션 데이터 | 복잡한 그래프 쿼리 |
| **Neo4j** | 그래프 관계, 벡터 검색 | 주 데이터 저장 |
| **Redis** | 캐싱, 세션 저장 | 영구 데이터 |

---

## 6. 관련 문서

| 문서 | 설명 |
|----------|-------------|
| [../05_llm/](../05_llm/) | LLM 서비스 아키텍처 |
| [../06_data/](../06_data/) | 데이터 아키텍처 |
| [../08_operations/](../08_operations/) | 배포 및 운영 |
| [../99_decisions/](../99_decisions/) | 아키텍처 결정 기록 |

---

*최종 수정일: 2026-02-02*
