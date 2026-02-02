# 시스템 개요

> **버전**: 2.1 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: frontend, backend, llm, data -->

---

## 이 문서가 답하는 질문

- 전체 시스템 구조는 어떠한가?
- 컴포넌트들은 어떻게 상호작용하는가?
- 주요 아키텍처 경계는 무엇인가?

---

## 1. 4계층 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  React SPA with TypeScript                                          │
│  - 165개 TSX 파일                                                   │
│  - 60+ 컴포넌트                                                     │
│  - Zustand 상태 관리                                                │
│  - TanStack Query 서버 상태                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST + SSE
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│  Spring Boot 3.2 (WebFlux + R2DBC)                                  │
│  - 32개 Controller                                                   │
│  - 150+ REST 엔드포인트                                             │
│  - Project-Scoped RBAC                                              │
│  - JWT 인증 (24시간)                                                │
└─────────────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
┌────────────────────────────────┐    ┌───────────────────────────────┐
│        DATA LAYER              │    │       AI LAYER                │
│  PostgreSQL + Redis + Neo4j    │    │  Flask + LangGraph            │
│  - 트랜잭션 작업               │    │  - Text2Query Engine          │
│  - 세션 관리                   │    │  - Hybrid RAG (RRF)           │
│  - 그래프 기반 RAG             │    │  - Query Validator (4계층)    │
└────────────────────────────────┘    └───────────────────────────────┘
```

---

## 2. 컴포넌트 책임

| 컴포넌트 | 책임 | 하지 않는 것 |
|-----------|---------------|-------------|
| **Frontend** | UI 렌더링, 상태 관리 | 비즈니스 로직, 직접 DB 접근 |
| **Backend** | 비즈니스 로직, 인가 | LLM 추론, 그래프 탐색 |
| **LLM Service** | AI 추론, RAG 검색 | 데이터 영속화, 인가 |
| **PostgreSQL** | 트랜잭션 데이터 | 복잡한 그래프 쿼리 |
| **Neo4j** | 그래프 관계, 벡터 검색 | 주 데이터 저장 |
| **Redis** | 캐싱, 세션 저장 | 영구 데이터 |

---

## 3. 통신 패턴

### 동기 (REST)

| From | To | 목적 |
|------|----|----|
| Frontend | Backend | 모든 API 호출 |
| Backend | LLM Service | 챗 요청 (타임아웃 포함) |

### 비동기 (이벤트 기반)

| From | To | 메커니즘 | 목적 |
|------|----|----|---------|
| Backend | Neo4j | Outbox 패턴 | 그래프 동기화 |
| LLM Service | Frontend | SSE | 스트리밍 응답 |

### 데이터 복제

| Source | Target | 패턴 | 지연 |
|--------|--------|---------|-------|
| PostgreSQL | Neo4j | Outbox + Polling | < 5분 |

---

## 4. 경계 결정

### 왜 LLM Service를 분리하는가?

1. **다른 스케일링 프로파일**: CPU/GPU 집약적 vs I/O 집약적
2. **장애 격리**: LLM 장애가 핵심 운영에 전파되지 않음
3. **기술 스택**: Python ML 생태계 vs Java 엔터프라이즈
4. **독립 배포**: 모델 업그레이드 시 백엔드 변경 불필요

### 왜 RAG에 Neo4j를 사용하는가?

1. **그래프 탐색**: 엔티티 간 관계
2. **벡터 인덱스**: 유사도 검색 네이티브 지원
3. **Cypher 쿼리**: 유연한 지식 검색
4. **관심사 분리**: 읽기 중심 RAG vs 쓰기 중심 PostgreSQL

---

## 5. 주요 제약

| 제약 | 근거 |
|------------|-----------|
| Backend는 Neo4j에 직접 쓰기 금지 | 트랜잭션 일관성 |
| LLM Service는 PostgreSQL 접근 금지 | 보안, 분리 |
| Frontend는 민감 데이터 저장 금지 | 보안 |
| 모든 API 호출에 JWT 필수 | 인증 |
| AI 생성 쿼리는 반드시 검증 | 보안 (ADR-005) |

---

## 6. 근거 출처

- 아키텍처 결정: [../99_decisions/ADR-001-service-separation.md](../99_decisions/ADR-001-service-separation.md)
- 구현: [../../docker-compose.yml](../../docker-compose.yml)
- 쿼리 보안: [../99_decisions/ADR-005-query-validation-security.md](../99_decisions/ADR-005-query-validation-security.md)

---

*최종 수정일: 2026-02-02*
