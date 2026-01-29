# PMS Backend v1.2 (Reactive)

Spring Boot WebFlux + R2DBC 기반 프로젝트 관리 시스템 백엔드

## 기술 스택

- **Framework:** Spring Boot 3.2.1 + WebFlux (Reactive)
- **Language:** Java 17
- **Database:** PostgreSQL 15 + R2DBC (Reactive Driver)
- **Cache:** Redis 7 (Reactive)
- **Security:** Spring Security Reactive + JWT
- **API Docs:** Swagger/OpenAPI 3
- **Graph DB:** Neo4j 5.20 (Outbox Pattern Sync)
- **Excel:** Apache POI 5.2.5 (WBS/Requirement Import/Export)

## 주요 기능

### Core Modules

| 모듈 | 설명 |
|------|------|
| **Project Management** | 프로젝트 CRUD, 멤버 관리, 기본 프로젝트 설정 |
| **Phase Management** | Waterfall 단계 관리, 산출물, KPI |
| **WBS Management** | 작업분해구조 (Group → Item → Task) |
| **Part Management** | 프로젝트 파트 및 파트 멤버 관리 |
| **Sprint Management** | 스프린트 계획 및 추적 |
| **User Story/Task** | 스토리, 태스크 관리 |
| **RFP/Requirement** | RFP 및 요구사항 관리 |
| **AI Assistant** | LLM 서비스 연동 Streaming 챗봇 |
| **Report Generation** | AI 기반 보고서 생성 |
| **Neo4j Lineage** | 데이터 계보 추적 (Outbox Pattern) |

### v1.2 Reactive Architecture

- **Full Reactive Stack**: WebFlux + R2DBC + Reactive Redis
- **Non-blocking I/O**: Mono/Flux 기반 비동기 처리
- **SSE Streaming**: AI 채팅 실시간 스트리밍
- **Outbox Pattern**: Neo4j 동기화를 위한 이벤트 아웃박스
- **Excel Import/Export**: WBS, Requirement 엑셀 처리 (Reactive)

## 실행 방법

### 개발 환경 (Docker Compose)

```bash
# 전체 환경 실행
docker-compose up -d

# 백엔드만 재시작
docker-compose restart backend

# 로그 확인
docker-compose logs -f backend
```

### 로컬 실행

```bash
cd PMS_IC_BackEnd_v1.2

# 빌드
mvn clean package -DskipTests

# 실행
java -jar target/pms-backend-1.2.jar
```

## API Endpoints (v1 Reactive)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | 로그인 |
| POST | `/api/v1/auth/logout` | 로그아웃 |
| GET | `/api/v1/auth/me` | 현재 사용자 정보 |

### Project Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | 프로젝트 목록 |
| GET | `/api/v1/projects/{id}` | 프로젝트 상세 |
| POST | `/api/v1/projects` | 프로젝트 생성 |
| PUT | `/api/v1/projects/{id}` | 프로젝트 수정 |
| DELETE | `/api/v1/projects/{id}` | 프로젝트 삭제 |
| POST | `/api/v1/projects/{id}/default` | 기본 프로젝트 설정 |

### Phase Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{projectId}/phases` | Phase 목록 |
| GET | `/api/v1/projects/{projectId}/phases/{id}` | Phase 상세 |
| POST | `/api/v1/projects/{projectId}/phases` | Phase 생성 |
| PUT | `/api/v1/projects/{projectId}/phases/{id}` | Phase 수정 |
| DELETE | `/api/v1/projects/{projectId}/phases/{id}` | Phase 삭제 |

### WBS Excel (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{projectId}/wbs/excel/export` | WBS Excel 내보내기 |
| GET | `/api/v1/projects/{projectId}/wbs/excel/template` | WBS 템플릿 다운로드 |
| POST | `/api/v1/projects/{projectId}/wbs/excel/import` | WBS Excel 가져오기 |
| POST | `/api/v1/projects/{projectId}/wbs/excel/validate` | WBS Excel 검증 |

### Requirement Excel (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{projectId}/requirements/excel/export` | 요구사항 Excel 내보내기 |
| GET | `/api/v1/projects/{projectId}/requirements/excel/export/rfp/{rfpId}` | RFP별 요구사항 내보내기 |
| GET | `/api/v1/projects/{projectId}/requirements/excel/template` | 요구사항 템플릿 다운로드 |
| POST | `/api/v1/projects/{projectId}/requirements/excel/import` | 요구사항 Excel 가져오기 |

### Sprint Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{projectId}/sprints` | 스프린트 목록 |
| POST | `/api/v1/projects/{projectId}/sprints` | 스프린트 생성 |
| GET | `/api/v1/projects/{projectId}/sprints/active` | 활성 스프린트 |

### User Story
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{projectId}/user-stories` | 스토리 목록 |
| POST | `/api/v1/projects/{projectId}/user-stories` | 스토리 생성 |
| PUT | `/api/v1/projects/{projectId}/user-stories/{id}` | 스토리 수정 |

### AI Chat (Streaming SSE)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{projectId}/chat/sessions` | 채팅 세션 목록 |
| POST | `/api/v1/projects/{projectId}/chat/sessions` | 채팅 세션 생성 |
| POST | `/api/v1/chat/sessions/{sessionId}/stream` | 스트리밍 채팅 (SSE) |

### Lineage (Neo4j Sync)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/lineage/events` | 이벤트 목록 |
| POST | `/api/v1/lineage/publish` | 이벤트 발행 |
| GET | `/api/v1/lineage/stream` | 이벤트 스트림 (SSE) |

## 데이터베이스 스키마

### 주요 스키마

| Schema | 용도 |
|--------|------|
| `auth` | 사용자, 인증, 권한, Permission |
| `project` | 프로젝트, Phase, WBS, Part, Backlog |
| `task` | Sprint, UserStory, Task, WeeklyReport |
| `chat` | ChatSession, ChatMessage |
| `report` | Report, ReportTemplate |
| `rfp` | RFP, Requirement |
| `lineage` | OutboxEvent (Neo4j Sync) |
| `education` | Education, EducationHistory |

### R2DBC 엔티티

```
R2dbcProject, R2dbcPhase, R2dbcPart, R2dbcPartMember
R2dbcWbsGroup, R2dbcWbsItem, R2dbcWbsTask, R2dbcWbsDependency
R2dbcSprint, R2dbcUserStory, R2dbcTask, R2dbcWeeklyReport
R2dbcRfp, R2dbcRequirement
R2dbcOutboxEvent (Neo4j Outbox Pattern)
```

## 설정

### 환경 변수

```bash
# R2DBC Database
SPRING_R2DBC_URL=r2dbc:postgresql://postgres:5432/pms_db
SPRING_R2DBC_USERNAME=pms_user
SPRING_R2DBC_PASSWORD=pms_password

# Reactive Redis
SPRING_DATA_REDIS_HOST=redis
SPRING_DATA_REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# AI Service
AI_SERVICE_URL=http://llm-service:8000

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=pmspassword123

# Lineage Poller
LINEAGE_POLLER_ENABLED=true
LINEAGE_POLLER_INTERVAL=5000
```

### Swagger UI

API 문서 확인: http://localhost:8083/swagger-ui.html

## 테스트

```bash
# 전체 테스트 실행
mvn test

# Reactive 서비스 테스트
mvn test -Dtest=ReactiveProjectServiceTest
mvn test -Dtest=ReactiveWbsExcelServiceTest
mvn test -Dtest=ReactiveRequirementExcelServiceTest

# Excel 테스트만 실행
mvn test -Dtest=*ExcelServiceTest
```

## 테스트 계정

모든 계정 비밀번호: `password123`

| Email | Role | Name |
|-------|------|------|
| kim@example.com | PM | 김철수 |
| lee@example.com | Developer | 이영희 |
| park@example.com | Developer | 박민수 |
| choi@example.com | QA | 최지훈 |
| jung@example.com | PMO_HEAD | 정수연 |
| kang@example.com | Sponsor | 강민재 |

## 관련 문서

- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - 시스템 아키텍처
- [DOCKER_SETUP.md](../docs/DOCKER_SETUP.md) - Docker 설정 가이드
- [coding-rules.md](../docs/coding-rules.md) - 코딩 규칙
- [BACKEND_RUN_GUIDE.md](./BACKEND_RUN_GUIDE.md) - 백엔드 실행 가이드
