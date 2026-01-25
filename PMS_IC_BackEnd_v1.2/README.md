# PMS Backend v1.2

Spring Boot 기반 프로젝트 관리 시스템 백엔드

## 기술 스택

- **Framework:** Spring Boot 3.2.1
- **Language:** Java 17
- **Database:** PostgreSQL 15 (prod), H2 (dev)
- **Cache:** Redis 7
- **Security:** Spring Security + JWT
- **API Docs:** Swagger/OpenAPI 3

## 주요 기능

### Core Modules

| 모듈 | 설명 |
|------|------|
| **Project Management** | 프로젝트 생성, 멤버 관리, 설정 |
| **Phase Management** | Waterfall 단계 관리, 산출물, KPI |
| **WBS Management** | 작업분해구조 (Group → Item → Task) |
| **Backlog Management** | 4-Level 계층 (Epic → Feature → Story → Task) |
| **Template System** | 프로젝트 템플릿 관리 및 적용 |
| **Integration** | Phase-Epic, Feature-WbsGroup, Story-WbsItem 연결 |
| **Task & Kanban** | 칸반 보드, 태스크 관리 |
| **Sprint Management** | 스프린트 계획 및 추적 |
| **AI Assistant** | LLM 서비스 연동 챗봇 |

### v1.2 New Features

- **WBS 3-Level 계층**: WbsGroup → WbsItem → WbsTask
- **Feature Entity**: Epic과 UserStory 사이 중간 계층
- **Template System**: 프로젝트 템플릿 생성/적용
- **Phase-Backlog Integration**: Phase ↔ Epic ↔ Feature ↔ WbsGroup 연결

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

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### Phase Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/phases` | 전체 Phase 목록 |
| GET | `/api/phases/{id}` | Phase 상세 |
| POST | `/api/phases` | Phase 생성 |
| PUT | `/api/phases/{id}` | Phase 수정 |
| DELETE | `/api/phases/{id}` | Phase 삭제 |
| GET | `/api/phases/{id}/deliverables` | 산출물 목록 |
| GET | `/api/phases/{id}/kpis` | KPI 목록 |

### WBS Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/phases/{phaseId}/wbs/groups` | WBS Group 목록 |
| POST | `/api/phases/{phaseId}/wbs/groups` | WBS Group 생성 |
| GET | `/api/wbs/groups/{groupId}` | WBS Group 상세 |
| PUT | `/api/wbs/groups/{groupId}` | WBS Group 수정 |
| DELETE | `/api/wbs/groups/{groupId}` | WBS Group 삭제 |
| GET | `/api/wbs/groups/{groupId}/items` | WBS Item 목록 |
| POST | `/api/wbs/groups/{groupId}/items` | WBS Item 생성 |
| GET | `/api/wbs/items/{itemId}` | WBS Item 상세 |
| PUT | `/api/wbs/items/{itemId}` | WBS Item 수정 |
| DELETE | `/api/wbs/items/{itemId}` | WBS Item 삭제 |
| GET | `/api/wbs/items/{itemId}/tasks` | WBS Task 목록 |
| POST | `/api/wbs/items/{itemId}/tasks` | WBS Task 생성 |
| GET | `/api/wbs/tasks/{taskId}` | WBS Task 상세 |
| PUT | `/api/wbs/tasks/{taskId}` | WBS Task 수정 |
| DELETE | `/api/wbs/tasks/{taskId}` | WBS Task 삭제 |

### Feature Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/epics/{epicId}/features` | Feature 목록 |
| POST | `/api/epics/{epicId}/features` | Feature 생성 |
| GET | `/api/features/{featureId}` | Feature 상세 |
| PUT | `/api/features/{featureId}` | Feature 수정 |
| DELETE | `/api/features/{featureId}` | Feature 삭제 |
| POST | `/api/features/{featureId}/link-wbs-group/{wbsGroupId}` | WBS Group 연결 |
| DELETE | `/api/features/{featureId}/link-wbs-group` | WBS Group 연결 해제 |

### Template Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | Template Set 목록 |
| GET | `/api/templates/{id}` | Template Set 상세 |
| POST | `/api/templates` | Template Set 생성 |
| DELETE | `/api/templates/{id}` | Template Set 삭제 |
| POST | `/api/templates/{id}/apply` | 프로젝트에 템플릿 적용 |

### Integration API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/integration/epic-phase` | Epic-Phase 연결 |
| DELETE | `/api/integration/epic-phase/{epicId}` | Epic-Phase 연결 해제 |
| GET | `/api/integration/phases/{phaseId}/epics` | Phase별 Epic 목록 |
| POST | `/api/integration/feature-group` | Feature-WbsGroup 연결 |
| DELETE | `/api/integration/feature-group/{featureId}` | Feature-WbsGroup 연결 해제 |
| POST | `/api/integration/story-item` | Story-WbsItem 연결 |
| DELETE | `/api/integration/story-item/{storyId}` | Story-WbsItem 연결 해제 |
| GET | `/api/integration/phases/{phaseId}/summary` | Phase 통합 현황 |

### Backlog Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | User Story 목록 |
| POST | `/api/stories` | User Story 생성 |
| PUT | `/api/stories/{id}` | User Story 수정 |
| DELETE | `/api/stories/{id}` | User Story 삭제 |
| GET | `/api/tasks` | Task 목록 |
| POST | `/api/tasks` | Task 생성 |
| PUT | `/api/tasks/{id}` | Task 수정 |
| DELETE | `/api/tasks/{id}` | Task 삭제 |

## 데이터베이스 스키마

### 주요 스키마

| Schema | 용도 |
|--------|------|
| `auth` | 사용자, 인증, 권한 |
| `project` | 프로젝트, Phase, WBS, Template |
| `task` | Task, UserStory, Sprint |
| `chat` | 채팅 세션, 메시지 |
| `report` | 주간/월간 보고서 |

### 새 테이블 (v1.2)

```sql
-- WBS 계층 구조
project.wbs_groups      -- Phase 하위 작업 그룹
project.wbs_items       -- Group 하위 작업 항목
project.wbs_tasks       -- Item 하위 세부 작업

-- Feature (Epic-Story 중간 계층)
project.features        -- Epic 하위 기능 단위

-- Template 시스템
project.template_sets       -- 템플릿 세트
project.phase_templates     -- Phase 템플릿
project.wbs_group_templates -- WBS Group 템플릿
project.wbs_item_templates  -- WBS Item 템플릿
```

## 설정

### 환경 변수

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/pms_db
SPRING_DATASOURCE_USERNAME=pms_user
SPRING_DATASOURCE_PASSWORD=pms_password

# Redis
SPRING_REDIS_HOST=redis
SPRING_REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# AI Service
AI_SERVICE_URL=http://llm-service:8000

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=pmspassword123
```

### Swagger UI

API 문서 확인: http://localhost:8083/swagger-ui.html

## 테스트

```bash
# 단위 테스트 실행
mvn test

# 특정 테스트 실행
mvn test -Dtest=WbsServiceTest
mvn test -Dtest=FeatureServiceTest
mvn test -Dtest=TemplateServiceTest
mvn test -Dtest=IntegrationServiceTest
```

## Default Test Users

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
