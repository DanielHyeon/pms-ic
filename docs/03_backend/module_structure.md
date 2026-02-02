# 모듈 구조

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: backend -->

---

## 이 문서가 답하는 질문

- 백엔드 패키지는 어떻게 구성되어 있는가?
- 각 모듈은 무엇을 포함하는가?
- 새 코드는 어디에 추가해야 하는가?

---

## 1. 패키지 개요

```
com.insuretech.pms/
├── auth/           # 인증 및 인가
├── project/        # 프로젝트 관리 핵심
├── task/           # 애자일 태스크 관리
├── chat/           # AI 채팅 기능
├── rfp/            # RFP 및 요구사항
├── report/         # 보고서 생성
├── education/      # 교육 관리
├── lineage/        # 데이터 계보 (Neo4j)
├── rag/            # RAG 검색 통합
└── common/         # 공유 컴포넌트
```

---

## 2. 모듈 구조 패턴

각 도메인 모듈은 다음 구조를 따릅니다:

```
{module}/
├── package-info.java      # 모듈 문서화
├── reactive/
│   ├── entity/           # R2DBC 엔티티
│   └── repository/       # 리액티브 리포지토리
├── dto/                  # 데이터 전송 객체
├── enums/                # 도메인 열거형
├── service/              # 비즈니스 로직
└── controller/           # REST 엔드포인트
```

---

## 3. 모듈 상세

### 3.1 auth/ - 인증

**목적**: 사용자 인증, 인가, 권한 관리

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcUser, R2dbcPermission, R2dbcRolePermission |
| `reactive/repository/` | ReactiveUserRepository, ReactivePermissionRepository |
| `service/` | ReactiveAuthService, JwtTokenProvider |
| `controller/` | ReactiveUserController, ReactivePermissionController |

### 3.2 project/ - 프로젝트 관리

**목적**: 핵심 프로젝트 관리 엔티티

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcProject, R2dbcPhase, R2dbcWbsGroup, R2dbcWbsItem, R2dbcWbsTask, R2dbcDeliverable, R2dbcPart, R2dbcProjectMember, R2dbcIssue, R2dbcMeeting, R2dbcKpi |
| `reactive/repository/` | ReactiveProjectRepository, ReactivePhaseRepository 등 |
| `dto/` | ProjectDto, PhaseDto, WbsDto, DeliverableDto |
| `service/` | ReactiveProjectService, ReactiveDeliverableService |
| `controller/` | ReactiveProjectController |

### 3.3 task/ - 태스크 관리

**목적**: 스프린트, 사용자 스토리, 칸반 태스크 관리

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcSprint, R2dbcUserStory, R2dbcTask, R2dbcKanbanColumn, R2dbcWeeklyReport |
| `reactive/repository/` | ReactiveSprintRepository, ReactiveTaskRepository |
| `service/` | ReactiveSprintService, ReactiveTaskService |
| `controller/` | ReactiveSprintController, ReactiveTaskController |

### 3.4 chat/ - AI 채팅

**목적**: AI 어시스턴트 채팅 세션 및 메시지

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcChatSession, R2dbcChatMessage |
| `reactive/repository/` | ReactiveChatSessionRepository, ReactiveChatMessageRepository |
| `dto/` | ChatRequest, ChatResponse, ChatMessageDto |
| `service/` | ReactiveChatService |
| `controller/` | ReactiveChatController |

### 3.5 rfp/ - RFP 및 요구사항

**목적**: 제안요청서 및 요구사항 추적

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcRfp, R2dbcRequirement |
| `enums/` | RfpStatus, RequirementStatus, RequirementCategory, Priority |
| `service/` | ReactiveRfpService, ReactiveRequirementService |
| `controller/` | ReactiveRfpController, ReactiveRequirementController |

### 3.6 report/ - 보고서 생성

**목적**: 보고서 템플릿 및 생성

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcReport, R2dbcReportTemplate |
| `enums/` | ReportType, ReportStatus, ReportScope, GenerationMode |
| `service/` | ReactiveReportService |
| `controller/` | ReactiveReportController |

### 3.7 education/ - 교육 관리

**목적**: 교육 세션 및 이력 추적

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcEducation, R2dbcEducationSession, R2dbcEducationHistory, R2dbcEducationRoadmap |
| `reactive/repository/` | ReactiveEducationRepository 등 |
| `service/` | ReactiveEducationService |
| `controller/` | ReactiveEducationController |

### 3.8 lineage/ - 데이터 계보

**목적**: 데이터 계보를 위한 Neo4j 그래프 작업

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcOutboxEvent |
| `config/` | Neo4jConfig |
| `enums/` | LineageEventType |
| `service/` | ReactiveLineageService |
| `controller/` | ReactiveLineageController |

### 3.9 rag/ - RAG 통합

**목적**: RAG 검색을 위한 LLM 서비스 통합

| 패키지 | 내용 |
|--------|------|
| `service/` | RAGSearchService, RAGIndexingService |

### 3.10 common/ - 공유 컴포넌트

**목적**: 모든 모듈에서 공유하는 횡단 관심사

| 패키지 | 내용 |
|--------|------|
| `reactive/entity/` | R2dbcBaseEntity |
| `config/` | R2dbcConfig, ReactiveRedisConfig, WebClientConfig, MailConfig |
| `security/` | JwtWebFilter, ReactiveProjectSecurityService, RoleAccessLevel |
| `exception/` | CustomException, GlobalExceptionHandler, ErrorResponse |
| `service/` | FileStorageService, ExcelService |
| `client/` | WebClientErrorHandler |
| `util/` | EnumParser |

---

## 4. 새 코드 추가 위치

| 새 코드 유형 | 위치 |
|--------------|------|
| 새 도메인 엔티티 | `{domain}/reactive/entity/R2dbc{Name}.java` |
| 새 리포지토리 | `{domain}/reactive/repository/Reactive{Name}Repository.java` |
| 새 서비스 | `{domain}/service/Reactive{Name}Service.java` |
| 새 컨트롤러 | `{domain}/controller/Reactive{Name}Controller.java` |
| 새 DTO | `{domain}/dto/{Name}Dto.java` |
| 새 열거형 | `{domain}/enums/{Name}.java` |
| 공유 유틸리티 | `common/util/{Name}.java` |
| 보안 필터 | `common/security/{Name}.java` |
| 설정 클래스 | `common/config/{Name}Config.java` |

---

## 5. 모듈 간 의존성

```
common (모든 모듈에서 공유)
   │
   ├─── auth (독립적)
   │
   ├─── project ─── auth에 의존
   │       │
   │       ├─── task ─── project에 의존
   │       │
   │       ├─── chat ─── project에 의존
   │       │
   │       ├─── rfp ─── project에 의존
   │       │
   │       └─── report ─── project에 의존
   │
   ├─── lineage ─── project, task에 의존
   │
   └─── rag ─── project, chat에 의존
```

---

## 6. 네이밍 컨벤션

| 유형 | 컨벤션 | 예시 |
|------|--------|------|
| 엔티티 | `R2dbc` 접두사 | `R2dbcProject` |
| 리포지토리 | `Reactive` 접두사 | `ReactiveProjectRepository` |
| 서비스 | `Reactive` 접두사 | `ReactiveProjectService` |
| 컨트롤러 | `Reactive` 접두사 | `ReactiveProjectController` |
| DTO | `Dto` 접미사 | `ProjectDto` |
| 열거형 | PascalCase | `ProjectStatus` |
| 설정 | `Config` 접미사 | `R2dbcConfig` |

---

## 7. 구현 현황

| 항목 | 개수 |
|------|------|
| Java 파일 총계 | 361개 |
| Controllers | 32개 |
| R2DBC Entities | 45개 |
| Reactive Repositories | 40+ |
| Services | 50+ |

---

*최종 수정일: 2026-02-02*
