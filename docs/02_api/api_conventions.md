# API 컨벤션

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: api, frontend, backend -->

---

## 이 문서가 답하는 질문

- API 설계를 지배하는 규칙은 무엇인가?
- 요청/응답은 어떻게 포맷되어야 하는가?
- 어떤 HTTP 메서드가 무엇에 사용되는가?

---

## 1. URL 컨벤션

### 리소스 네이밍

| 규칙 | 예시 |
|------|------|
| 복수형 명사 | `/projects`, `/tasks`, `/users` |
| 소문자 + 하이픈 | `/user-stories`, `/wbs-groups` |
| 중첩 리소스 | `/projects/{id}/phases/{phaseId}` |
| URL에 동사 금지 | 대신 HTTP 메서드 사용 |

### 경로 파라미터

```
/api/v2/projects/{projectId}/tasks/{taskId}

projectId: UUID 또는 문자열 식별자
taskId: UUID 또는 문자열 식별자
```

### 쿼리 파라미터

```
GET /api/v2/projects?status=ACTIVE&page=0&size=20&sort=createdAt,desc
```

| 파라미터 | 목적 | 기본값 |
|----------|------|--------|
| `page` | 페이지 번호 (0부터 시작) | 0 |
| `size` | 페이지 크기 | 20 |
| `sort` | 정렬 필드와 방향 | 다양함 |
| 필터 파라미터 | 리소스별 필터 | - |

---

## 2. HTTP 메서드

| 메서드 | 목적 | 멱등성 | 요청 본문 |
|--------|------|--------|----------|
| `GET` | 리소스 조회 | 예 | 아니오 |
| `POST` | 리소스 생성 | 아니오 | 예 |
| `PUT` | 전체 업데이트 | 예 | 예 |
| `PATCH` | 부분 업데이트 | 예 | 예 |
| `DELETE` | 리소스 삭제 | 예 | 아니오 |

### 메서드 선택 규칙

| 동작 | 메서드 | 예시 |
|------|--------|------|
| 리소스 목록 | GET | `GET /projects` |
| 단일 리소스 조회 | GET | `GET /projects/123` |
| 새로 생성 | POST | `POST /projects` |
| 전체 교체 | PUT | `PUT /projects/123` |
| 필드 업데이트 | PATCH | `PATCH /projects/123` |
| 삭제 | DELETE | `DELETE /projects/123` |
| 커스텀 액션 | POST | `POST /projects/123/archive` |

---

## 3. 요청 형식

### Content-Type

```http
Content-Type: application/json
```

### 요청 본문 예시

```json
{
  "name": "New Project",
  "description": "Project description",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30"
}
```

### 날짜 형식

ISO 8601: `YYYY-MM-DD` 또는 `YYYY-MM-DDTHH:mm:ss.sssZ`

---

## 4. 응답 형식

### 표준 응답 래퍼

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-01-31T10:00:00Z",
    "requestId": "uuid"
  }
}
```

### 페이지네이션 응답

```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": {
      "number": 0,
      "size": 20,
      "totalElements": 150,
      "totalPages": 8
    }
  }
}
```

---

## 5. HTTP 상태 코드

### 성공 코드

| 코드 | 의미 | 사용 시기 |
|------|------|----------|
| 200 | OK | GET, PUT, PATCH 성공 |
| 201 | Created | POST 성공 |
| 204 | No Content | DELETE 성공 |

### 오류 코드

| 코드 | 의미 | 사용 시기 |
|------|------|----------|
| 400 | Bad Request | 잘못된 요청 본문 |
| 401 | Unauthorized | 토큰 없음/유효하지 않음 |
| 403 | Forbidden | 권한 부족 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 리소스 중복 |
| 422 | Unprocessable Entity | 유효성 검사 실패 |
| 500 | Internal Server Error | 서버 오류 |

---

## 6. 오류 응답 형식

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

## 7. 필드 네이밍

### JSON 필드

| 컨벤션 | 예시 |
|--------|------|
| camelCase | `projectId`, `createdAt` |
| Boolean 접두사 | `isActive`, `hasChildren` |
| Date 접미사 | `createdAt`, `updatedAt` |
| ID 접미사 | `projectId`, `userId` |

### Nullable 필드

```json
{
  "description": "Some text",
  "assigneeId": null
}
```

Nullable 필드는 반드시 API 스펙에 문서화되어야 합니다.

---

## 8. 버전 관리 전략

### 현재 상태

명시적 버전: **v2** (리액티브 API)

### 버전 관리 패턴

```
/api/v2/projects
```

브레이킹 체인지는 새 버전이 필요합니다.

---

## 9. 결정 사항 (Decisions)

- 모든 API에 REST + JSON 사용
- JSON 필드에 camelCase 사용
- 모든 프로젝트 엔드포인트에 프로젝트 범위 인가
- 모든 목록 엔드포인트에 페이지네이션

## 10. 금지 사항 (Prohibited)

- URL 경로에 동사 (메서드 사용)
- JSON 필드에 snake_case
- 원시 데이터베이스 오류 반환
- URL에 내부 ID 노출

---

*최종 수정일: 2026-02-02*
