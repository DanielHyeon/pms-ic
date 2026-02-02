# 백엔드 문서

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: backend, api -->

---

## 이 문서가 답하는 질문

- 백엔드는 어떻게 구성되어 있는가?
- 핵심 도메인 엔티티는 무엇인가?
- 리액티브 아키텍처는 어떻게 동작하는가?
- 어떤 모듈이 존재하며 무엇을 하는가?

---

## 이 섹션의 문서

| 문서 | 목적 |
|----------|---------|
| [domain_model.md](./domain_model.md) | 핵심 엔티티와 관계 |
| [module_structure.md](./module_structure.md) | 패키지 구성 |
| [reactive_patterns.md](./reactive_patterns.md) | WebFlux와 R2DBC 패턴 |

---

## 1. 기술 스택

| 컴포넌트 | 기술 | 목적 |
|-----------|------------|---------|
| Framework | Spring Boot 3.2 | 애플리케이션 프레임워크 |
| Reactive | Spring WebFlux | 논블로킹 웹 계층 |
| Database Access | R2DBC | 리액티브 데이터베이스 접근 |
| Database | PostgreSQL 17 | 주 데이터 저장소 |
| Cache | Redis 8 (Reactive) | 세션 및 캐싱 |
| Graph DB | Neo4j 2025.01 | 계보 및 RAG |

---

## 2. 모듈 개요

```text
com.insuretech.pms/
├── auth/           # 인증 및 사용자 관리
├── project/        # 프로젝트, 단계, WBS, 산출물
├── task/           # 스프린트, 사용자스토리, 태스크, 칸반
├── chat/           # AI 채팅 세션 및 메시지
├── rfp/            # RFP 및 요구사항
├── report/         # 보고서 생성
├── education/      # 교육 관리
├── lineage/        # Neo4j 그래프 작업
├── rag/            # RAG 검색 통합
└── common/         # 공유 유틸리티, 보안, 설정
```

---

## 3. 계층형 아키텍처

```text
┌─────────────────────────────────────────┐
│           Controller Layer              │
│    ReactiveXxxController (WebFlux)      │
├─────────────────────────────────────────┤
│            Service Layer                │
│     ReactiveXxxService (Business)       │
├─────────────────────────────────────────┤
│          Repository Layer               │
│   ReactiveXxxRepository (R2DBC)         │
├─────────────────────────────────────────┤
│            Entity Layer                 │
│      R2dbcXxx extends R2dbcBaseEntity   │
└─────────────────────────────────────────┘
```

### 네이밍 컨벤션

| 계층 | 접두사 | 예시 |
|-------|--------|---------|
| Entity | `R2dbc` | `R2dbcProject`, `R2dbcPhase` |
| Repository | `Reactive` | `ReactiveProjectRepository` |
| Service | `Reactive` | `ReactiveProjectService` |
| Controller | `Reactive` | `ReactiveProjectController` |

---

## 4. 핵심 설계 결정

### 왜 리액티브 (WebFlux + R2DBC)인가?

| 측면 | 결정 |
|--------|----------|
| 높은 동시성 | 논블로킹 I/O가 더 많은 동시 요청 처리 |
| 외부 서비스 호출 | LLM 서비스 호출이 리액티브 백프레셔 활용 |
| 리소스 효율성 | I/O 중 스레드 풀 블로킹 없음 |

### 왜 스키마를 분리하는가?

PostgreSQL 스키마별 도메인:

- `auth` - User, Permission, RolePermission
- `project` - Project, Phase, WBS, Deliverable
- `task` - Sprint, UserStory, Task, KanbanColumn
- `chat` - ChatSession, ChatMessage
- `report` - Report, ReportTemplate
- `rfp` - Rfp, Requirement
- `lineage` - OutboxEvent

---

## 5. 보안 아키텍처

### 프로젝트 범위 RBAC

```java
@PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
public Mono<List<TaskDto>> getProjectTasks(String projectId) { ... }

@PreAuthorize("@reactiveProjectSecurity.hasRole(#projectId, 'PM')")
public Mono<Void> updateProject(String projectId, ProjectDto dto) { ... }
```

### 역할 계층

| 역할 | 접근 수준 |
|------|--------------|
| ADMIN | 시스템 전체 접근 |
| AUDITOR | 읽기 전용 시스템 전체 |
| PM | 전체 프로젝트 접근 |
| PMO_HEAD | 다중 프로젝트 감독 |
| SPONSOR | 전략적 결정 |
| DEVELOPER | 태스크 실행 |
| QA | 테스트 태스크 |
| BUSINESS_ANALYST | 요구사항 |
| MEMBER | 기본 읽기 접근 |

---

## 6. 외부 통합

### LLM 서비스 통합

```text
Backend ──HTTP/SSE──> LLM Service (localhost:8000)
         WebClient      Flask + LangGraph
```

### Neo4j 통합

```text
Backend ──Bolt──> Neo4j (localhost:7687)
         Driver    계보용 그래프 DB
```

### Redis 통합

```text
Backend ──Reactive──> Redis (localhost:6379)
         Lettuce       캐싱, 스트림
```

---

## 7. 설정

### 주요 속성 (application.yml)

```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5433/pms_db
  data:
    redis:
      host: localhost
      port: 6379
  neo4j:
    uri: bolt://localhost:7687

app:
  llm:
    service-url: http://localhost:8000
  jwt:
    secret: ${JWT_SECRET}
    expiration: 86400000
```

---

## 8. 금지 패턴

- 리액티브 체인에서 블로킹 호출 (불가피하면 `publishOn` 사용)
- 컨트롤러에서 직접 데이터베이스 접근
- 코드에 자격 증명 하드코딩
- API 응답에 내부 엔티티 ID 노출
- 프로젝트 범위 엔드포인트에서 멤버십 검사 생략

---

## 9. 구현 현황

| 항목 | 개수 |
|------|------|
| Controllers | 32개 |
| R2DBC Entities | 45개 |
| Reactive Repositories | 40+ |
| Services | 50+ |
| Java 파일 총계 | 361개 |

---

## 10. 관련 문서

| 문서 | 설명 |
|----------|-------------|
| [../02_api/](../02_api/) | API 엔드포인트 문서 |
| [../06_data/](../06_data/) | 데이터베이스 스키마 문서 |
| [../07_security/](../07_security/) | 보안 아키텍처 |

---

*최종 수정일: 2026-02-02*
