# 서비스 경계

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: backend, llm, data -->

---

## 이 문서가 답하는 질문

- 왜 서비스가 이렇게 분리되어 있는가?
- 한 서비스가 실패하면 어떻게 되는가?
- 동기/비동기 경계는 어디인가?

---

## 1. 서비스 경계 다이어그램

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         동기 경계 (SYNCHRONOUS BOUNDARY)                  │
│  ┌─────────────┐         REST          ┌─────────────────────────────┐  │
│  │   Frontend  │◄─────────────────────►│        Backend              │  │
│  │   (React)   │                       │    (Spring WebFlux)         │  │
│  └─────────────┘                       └──────────────┬──────────────┘  │
│                                                       │                  │
└───────────────────────────────────────────────────────│──────────────────┘
                                                        │
                              ┌─────────────────────────┼─────────────────┐
                              │   비동기 경계            │                 │
                              │   (ASYNC BOUNDARY)      ▼                 │
                              │  ┌──────────────────────────────────────┐│
                              │  │          LLM Service                 ││
                              │  │   ┌────────────────────────────────┐ ││
                              │  │   │ HTTP (timeout: 90s)            │ ││
                              │  │   │ SSE streaming for responses    │ ││
                              │  │   │ Text2Query + Query Validator   │ ││
                              │  │   └────────────────────────────────┘ ││
                              │  └──────────────────────────────────────┘│
                              │                                          │
                              └──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      이벤트 기반 경계 (EVENT-DRIVEN BOUNDARY)             │
│                                                                         │
│   ┌───────────────┐    Outbox Events    ┌───────────────────────────┐  │
│   │  PostgreSQL   │─────────────────────►│     Neo4j                 │  │
│   │               │    (polling)         │   (graph sync)            │  │
│   └───────────────┘                      └───────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 서비스 책임

### Backend (Spring Boot)

**소유:**
- 사용자 인증 및 인가
- 모든 트랜잭션 데이터 작업
- 비즈니스 규칙 적용
- 프론트엔드와의 API 계약

**호출:**
- PostgreSQL (R2DBC - 리액티브)
- Redis (캐싱, 세션)
- LLM Service (HTTP - 서킷 브레이커 포함)

**하지 않는 것:**
- LLM 추론 실행
- Neo4j에 직접 쓰기
- LLM에 대한 장시간 연결 유지

### LLM Service (Flask)

**소유:**
- LLM 모델 관리
- RAG 파이프라인 실행
- 응답 생성
- Text2Query (자연어 → SQL/Cypher)
- 쿼리 검증 (4계층 보안)

**호출:**
- Neo4j (읽기 전용, Cypher 쿼리)
- 로컬 LLM 모델 (GGUF)
- 임베딩 서비스 (E5-Large)

**하지 않는 것:**
- PostgreSQL 접근
- 인가 결정
- 채팅 히스토리 영속화 (백엔드가 담당)

---

## 3. 장애 격리

| 장애 시나리오 | 영향 | 복구 |
|------------------|--------|----------|
| LLM Service 다운 | AI 채팅 불가 | 목 응답, 우아한 성능 저하 |
| Neo4j 다운 | RAG 불가 | LLM이 컨텍스트 없이 응답 |
| PostgreSQL 다운 | 시스템 불가 | 전체 장애, 헬스 체크 실패 |
| Redis 다운 | 캐시 미스 | 직접 DB 쿼리, 느려짐 |
| Frontend 다운 | UI 불가 | 백엔드 API는 계속 동작 |

### 서킷 브레이커 설정

```yaml
# LLM Service 서킷 브레이커
llm-service:
  timeout: 90s
  failure-rate-threshold: 50%
  wait-duration-in-open-state: 60s
  permitted-calls-in-half-open: 3
```

---

## 4. 데이터 소유권

| 데이터 타입 | 주 저장소 | 복제 대상 |
|-----------|---------------|---------------|
| 사용자 계정 | PostgreSQL (auth) | - |
| 프로젝트, 단계 | PostgreSQL (project) | Neo4j (노드) |
| 태스크, 스프린트 | PostgreSQL (task) | Neo4j (노드) |
| 채팅 세션 | PostgreSQL (chat) | - |
| 보고서 | PostgreSQL (report) | - |
| 그래프 관계 | - | Neo4j (관계) |
| 문서 청크 | - | Neo4j (벡터) |

---

## 5. 통합 포인트

### Backend → LLM Service

```text
엔드포인트: POST /api/chat/v2
타임아웃: 90초
재시도: 0 (빠른 실패)
서킷 브레이커: 예

성공: 200 + SSE 스트림
실패: 503 + 목 응답
```

### PostgreSQL → Neo4j (Outbox)

```text
패턴: Transactional Outbox
폴링 간격: 5분
전체 동기화: 24시간
이벤트: CREATE, UPDATE, DELETE
```

---

## 6. 왜 이런 경계인가?

| 결정 | 근거 |
|----------|-----------|
| Backend가 모든 쓰기 소유 | 단일 진실 소스, 트랜잭션 무결성 |
| LLM Service는 무상태 | 수평 스케일링, 쉬운 복구 |
| 이벤트 기반 그래프 동기화 | 분리, 최종 일관성 허용 |
| SSE로 스트리밍 | 폴링 없이 실시간 응답 |
| 쿼리 검증 필수 | AI 생성 쿼리 보안 (ADR-005) |

---

## 7. 관련 문서

| 문서 | 설명 |
|----------|-------------|
| [../99_decisions/ADR-001-service-separation.md](../99_decisions/ADR-001-service-separation.md) | 서비스 분리 결정 |
| [../99_decisions/ADR-002-outbox-pattern.md](../99_decisions/ADR-002-outbox-pattern.md) | Outbox 패턴 결정 |
| [../99_decisions/ADR-005-query-validation-security.md](../99_decisions/ADR-005-query-validation-security.md) | 쿼리 검증 보안 |

---

*최종 수정일: 2026-02-02*
