# 오류 코드 참조

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: api, frontend -->

---

## 이 문서가 답하는 질문

- API가 반환할 수 있는 오류 코드는 무엇인가?
- 각 오류 코드는 무엇을 의미하는가?
- 프론트엔드는 각 오류를 어떻게 처리해야 하는가?

---

## 1. 오류 응답 구조

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [ ... ]
  }
}
```

---

## 2. 인증 오류 (401)

| 코드 | 메시지 | 사용자 조치 |
|------|--------|-------------|
| `UNAUTHORIZED` | 인증 필요 | 로그인으로 리다이렉트 |
| `INVALID_TOKEN` | 토큰이 유효하지 않거나 만료됨 | 로그인으로 리다이렉트 |
| `TOKEN_EXPIRED` | 토큰이 만료됨 | 로그인으로 리다이렉트 |
| `INVALID_CREDENTIALS` | 잘못된 이메일 또는 비밀번호 | 오류 표시, 재시도 |

---

## 3. 인가 오류 (403)

| 코드 | 메시지 | 사용자 조치 |
|------|--------|-------------|
| `FORBIDDEN` | 접근 거부 | 권한 오류 표시 |
| `NOT_PROJECT_MEMBER` | 이 프로젝트의 멤버가 아님 | PM에게 연락 |
| `INSUFFICIENT_ROLE` | 역할에 권한이 없음 | PM에게 연락 |

---

## 4. 유효성 검사 오류 (400, 422)

| 코드 | 메시지 | 사용자 조치 |
|------|--------|-------------|
| `VALIDATION_ERROR` | 요청 유효성 검사 실패 | 폼 입력 수정 |
| `INVALID_FORMAT` | 잘못된 데이터 형식 | 입력 형식 수정 |
| `MISSING_FIELD` | 필수 필드 누락 | 필수 필드 입력 |
| `INVALID_DATE_RANGE` | 종료일이 시작일보다 빠름 | 날짜 범위 수정 |

### 유효성 검사 오류 상세

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Invalid email format"
    },
    {
      "field": "name",
      "code": "MISSING_FIELD",
      "message": "Name is required"
    }
  ]
}
```

---

## 5. 리소스 오류 (404, 409)

| 코드 | 메시지 | 사용자 조치 |
|------|--------|-------------|
| `NOT_FOUND` | 리소스를 찾을 수 없음 | 다른 페이지로 이동 |
| `PROJECT_NOT_FOUND` | 프로젝트가 존재하지 않음 | 프로젝트 목록으로 이동 |
| `TASK_NOT_FOUND` | 태스크가 존재하지 않음 | 페이지 새로고침 |
| `DUPLICATE_RESOURCE` | 리소스가 이미 존재함 | 다른 이름 사용 |
| `CONFLICT` | 리소스 상태 충돌 | 새로고침 후 재시도 |

---

## 6. 비즈니스 로직 오류 (422)

| 코드 | 메시지 | 사용자 조치 |
|------|--------|-------------|
| `PHASE_NOT_READY` | 단계 게이트가 승인되지 않음 | 게이트 리뷰 완료 |
| `SPRINT_ACTIVE` | 활성 스프린트를 수정할 수 없음 | 대기 또는 PM에게 연락 |
| `DELIVERABLE_LOCKED` | 산출물이 잠김 | 승인자에게 연락 |
| `MAX_WIP_REACHED` | WIP 한도 도달 | 기존 태스크 완료 |

---

## 7. AI/채팅 오류

| 코드 | 메시지 | 사용자 조치 |
|------|--------|-------------|
| `AI_SERVICE_UNAVAILABLE` | AI 서비스 일시적 불가 | 나중에 재시도 |
| `AI_TIMEOUT` | AI 응답 시간 초과 | 재시도 또는 질문 단순화 |
| `NO_CONTEXT_FOUND` | 관련 문서를 찾을 수 없음 | 질문 재구성 |
| `OUT_OF_SCOPE` | 시스템 범위 밖의 질문 | 다른 질문 |
| `QUERY_VALIDATION_FAILED` | AI 생성 쿼리 검증 실패 | 질문 재구성 |

---

## 8. 서버 오류 (500)

| 코드 | 메시지 | 사용자 조치 |
|------|--------|-------------|
| `INTERNAL_ERROR` | 내부 서버 오류 | 관리자에게 보고 |
| `DATABASE_ERROR` | 데이터베이스 작업 실패 | 나중에 재시도 |
| `SERVICE_ERROR` | 외부 서비스 오류 | 나중에 재시도 |

---

## 9. 프론트엔드 오류 처리

### 권장 처리 방법

```typescript
switch (error.code) {
  case 'UNAUTHORIZED':
  case 'INVALID_TOKEN':
  case 'TOKEN_EXPIRED':
    // 로그인으로 리다이렉트
    redirectToLogin();
    break;

  case 'FORBIDDEN':
  case 'NOT_PROJECT_MEMBER':
    // 권한 오류 표시
    showPermissionError(error.message);
    break;

  case 'VALIDATION_ERROR':
    // 필드 레벨 오류 표시
    showFieldErrors(error.details);
    break;

  case 'NOT_FOUND':
    // 이동 또는 not found 표시
    showNotFound();
    break;

  case 'AI_SERVICE_UNAVAILABLE':
  case 'AI_TIMEOUT':
    // AI 폴백 메시지 표시
    showAIFallback();
    break;

  default:
    // 일반 오류
    showGenericError(error.message);
}
```

---

## 10. 오류 코드 레지스트리

모든 오류 코드는 반드시:
1. 대문자와 밑줄 사용
2. 오류를 설명하는 이름
3. 이 문서에 문서화됨
4. 엔드포인트 간 일관성 유지

새 코드 추가 시 이 문서를 업데이트해야 합니다.

---

*최종 수정일: 2026-02-02*
