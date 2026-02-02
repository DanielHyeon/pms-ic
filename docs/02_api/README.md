# API 문서

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: api, frontend, backend -->

---

## 이 문서가 답하는 질문

- 어떤 API가 존재하고 어떻게 호출하는가?
- 요청/응답 형식은 무엇인가?
- 어떤 오류가 발생할 수 있는가?
- 어떤 인증이 필요한가?

---

## 이 섹션의 문서

| 문서 | 목적 |
|------|------|
| [api_conventions.md](./api_conventions.md) | API 설계 규칙 |
| [error_codes.md](./error_codes.md) | 오류 코드 참조 |

---

## 1. API 개요

### 기본 URL

| 환경 | Backend | LLM Service |
|------|---------|-------------|
| 개발 | `http://localhost:8083` | `http://localhost:8000` |
| Docker | `http://backend:8083` | `http://llm-service:8000` |

### API 접두사

모든 REST 엔드포인트: `/api/**`

---

## 2. 인증

### JWT 토큰

모든 인증된 엔드포인트는 다음이 필요합니다:

```http
Authorization: Bearer <jwt-token>
```

### 토큰 획득

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

응답:
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "User Name",
    "systemRole": null
  },
  "projectRoles": [
    {
      "projectId": "proj-001",
      "projectName": "Insurance Claims System",
      "role": "pm"
    }
  ]
}
```

---

## 3. 공통 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 오류 응답

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

---

## 4. API 카테고리

### 핵심 API (Backend)

| 카테고리 | 기본 경로 | 설명 |
|----------|-----------|------|
| Auth | `/api/auth/*` | 인증, 사용자 관리 |
| Projects | `/api/v2/projects/*` | 프로젝트 CRUD, 멤버 |
| Phases | `/api/v2/projects/{id}/phases/*` | 단계 관리 |
| WBS | `/api/v2/projects/{id}/wbs/*` | 작업 분류 체계 |
| Tasks | `/api/v2/projects/{id}/tasks/*` | 태스크/칸반 관리 |
| Sprints | `/api/v2/projects/{id}/sprints/*` | 스프린트 관리 |
| Issues | `/api/v2/projects/{id}/issues/*` | 이슈 추적 |
| Deliverables | `/api/v2/projects/{id}/deliverables/*` | 산출물 관리 |
| Chat | `/api/chat/*` | AI 채팅 세션 |
| Reports | `/api/reports/*` | 보고서 생성 |

### AI API (LLM Service)

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/chat/v2` | POST | AI와 채팅 (Two-Track) |
| `/api/chat/stream` | POST | SSE 스트리밍 채팅 |
| `/api/rag/index` | POST | RAG용 문서 인덱싱 |
| `/api/rag/documents/{id}` | DELETE | RAG에서 제거 |
| `/health` | GET | 서비스 헬스 체크 |

---

## 5. 인가 규칙

### 엔드포인트 인가

| 패턴 | 필요한 인가 |
|------|-------------|
| `/api/auth/*` | 공개 (로그인, 회원가입) |
| `/api/v2/projects` (GET) | 인증됨 (멤버십 기준 필터링) |
| `/api/v2/projects/{id}/*` | 프로젝트 멤버십 필요 |
| `/api/admin/*` | 시스템 ADMIN 역할 |

### 프로젝트 범위 엔드포인트

```
모든 /api/v2/projects/{projectId}/* 엔드포인트는 다음이 필요합니다:
1. 유효한 JWT 토큰
2. 사용자가 해당 프로젝트의 멤버여야 함
3. 사용자의 프로젝트 역할이 엔드포인트 요구사항과 일치해야 함
```

---

## 6. 레이트 리미팅

| 엔드포인트 유형 | 제한 |
|-----------------|------|
| Auth 엔드포인트 | 10 req/min |
| Chat 엔드포인트 | 20 req/min |
| 표준 API | 100 req/min |

---

## 7. 버전 관리

현재 API 버전: **v2** (리액티브 API)

레거시 버전: **v1** (더 이상 사용되지 않음)

---

## 8. 관련 문서

| 문서 | 설명 |
|------|------|
| [../07_security/](../07_security/) | 보안 아키텍처 |
| [../01_architecture/](../01_architecture/) | 시스템 아키텍처 |

---

*최종 수정일: 2026-02-02*
