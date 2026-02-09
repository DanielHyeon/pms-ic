# PMS Insurance Claims - 핵심 요약 (v2.3-reactive)

## 1. 미션
보험심사 프로젝트 전주기 관리 + GraphRAG AI 의사결정 지원 플랫폼

## 2. 기술 스택 요약 (2026년 1월 기준)
- Frontend: React 18 + TypeScript + Vite
- Backend: Spring Boot 3.2 + WebFlux + R2DBC + PostgreSQL 15 (스키마: auth,project,task,chat,report,rfp,lineage 등)
- AI/LLM: Flask + LangGraph + Gemma-3-12B-Q5_K_M (멀티-이-5-라지 임베딩)
- Graph DB: Neo4j 5.20 (벡터 + 순차 그래프 RAG)
- Cache: Redis 7 (Reactive)
- Infra: Docker Compose (postgres:5433, redis:6379, neo4j:7687, be:8083, fe:5173, llm:8000)

## 3. 핵심 도메인 엔티티 관계 (간략)
User → Project → Phase → WbsGroup → WbsItem → WbsTask
Project → Part → PartMember
Project → Sprint → UserStory → Task
Project ↔ ChatSession → ChatMessage
Project → Rfp → Requirement
→ R2DBC 엔티티: R2dbcProject, R2dbcPhase, R2dbcWbsGroup, R2dbcTask 등
→ Reactive Repository 패턴 사용 (Mono/Flux 반환)

## 4. AI 챗봇 동작 원리 (핵심 플로우)
1. Intent 분류
2. Casual → 바로 답변
3. Complex → RAG 검색 → 품질검증 → 낮으면 쿼리 개선 후 재검색 → 최종 답변 생성

## 5. 필수 개발 규칙
- TDD (pytest 우선)
- 작은 단위 커밋 + PR 필수
- Git Worktree 적극 활용
- 초등학생도 이해할 수 있게 코드 구현시 한글로 주석을 달것
- API 호출은 /api 폴더에서만

## 6. 보안 & 권한 핵심
- JWT (24시간) + Project-Scoped RBAC
- 시스템 역할: ADMIN, AUDITOR (전역)
- 프로젝트 역할: SPONSOR, PMO_HEAD, PM, DEVELOPER, QA, BUSINESS_ANALYST, MEMBER
- ProjectSecurityService: `@PreAuthorize("@projectSecurity.hasRole(#projectId, 'PM')")`
- Tenant-aware Dashboard: 사용자별 접근 가능한 프로젝트만 표시

## 7. 가장 자주 참조하는 설정값
- AI_SERVICE_URL=http://llm-service:8000
- MODEL_PATH=./models/google.gemma-3-12b-pt.Q5_K_M.gguf
- JWT_SECRET=환경변수 필수
- NEO4J_URI=bolt://neo4j:7687

## 8. 빠른 시작 명령어
docker-compose up -d

