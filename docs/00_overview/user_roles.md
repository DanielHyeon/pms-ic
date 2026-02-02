# 사용자 역할 및 권한

> **버전**: 2.0 | **최종 수정일**: 2026-02-02

---

## 이 문서가 답하는 질문

- 시스템에 어떤 역할이 존재하는가?
- 각 역할은 무엇을 할 수 있는가?
- 프로젝트 범위 인가는 어떻게 동작하는가?

---

## 1. 역할 분류

### 시스템 역할 (전역)

| 역할 | 범위 | 목적 |
|------|-------|---------|
| **ADMIN** | 시스템 전체 | 전체 시스템 관리 |
| **AUDITOR** | 시스템 전체 | 모든 프로젝트 읽기 전용 접근 |

### 프로젝트 역할 (프로젝트별)

| 역할 | 범위 | 목적 |
|------|-------|---------|
| **SPONSOR** | 프로젝트별 | 프로젝트 자금 지원 및 승인 |
| **PMO_HEAD** | 프로젝트별 | PMO 리더십 및 감독 |
| **PM** | 프로젝트별 | 프로젝트 실행 관리 |
| **DEVELOPER** | 프로젝트별 | 개발 태스크 |
| **QA** | 프로젝트별 | 품질 보증 |
| **BUSINESS_ANALYST** | 프로젝트별 | 요구사항 및 사용자 스토리 |
| **MEMBER** | 프로젝트별 | 일반 멤버십 |

---

## 2. 권한 매트릭스

| 권한 | SPONSOR | PMO_HEAD | PM | DEVELOPER | QA | BA | MEMBER |
|------------|:-------:|:--------:|:--:|:---------:|:--:|:--:|:------:|
| project.view | O | O | O | O | O | O | O |
| project.edit | O | O | O | - | - | - | - |
| project.delete | - | O | - | - | - | - | - |
| phase.manage | O | O | O | - | - | - | - |
| task.create | - | O | O | O | - | O | - |
| task.assign | - | O | O | - | - | - | - |
| task.update_status | - | O | O | O | O | O | - |
| issue.create | O | O | O | O | O | O | - |
| issue.edit | O | O | O | O | O | - | - |
| issue.delete | - | O | O | - | - | - | - |
| deliverable.upload | - | O | O | O | O | O | - |
| deliverable.approve | O | O | O | - | - | - | - |
| member.add | - | O | O | - | - | - | - |
| member.remove | - | O | O | - | - | - | - |
| report.generate | - | O | O | - | - | O | - |
| chat.use | O | O | O | O | O | O | O |

---

## 3. 인가 구현

### 프로젝트 범위 인가 패턴

```java
// 리액티브 컨트롤러 어노테이션
@PreAuthorize("@reactiveProjectSecurity.hasAnyRole(#projectId, 'PM', 'PMO_HEAD')")
public Mono<ProjectDto> updateProject(@PathVariable String projectId, ...) {
    // ...
}

// 멤버십만 확인
@PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
public Flux<TaskDto> getProjectTasks(@PathVariable String projectId) {
    // ...
}
```

### 인가 흐름

```
요청 → JWT 추출 → ReactiveProjectSecurityService
                              ↓
                   project_members 테이블 조회
                              ↓
              해당 프로젝트에서의 사용자 역할 확인
                              ↓
                   허용(Grant) 또는 거부(403 Forbidden)
```

---

## 4. 핵심 규칙

### 결정 사항 (Decisions)

- 사용자는 서로 다른 프로젝트에서 다른 역할을 가질 수 있음
- 시스템 역할(ADMIN, AUDITOR)은 프로젝트 범위 검사를 우회
- ADMIN은 모든 프로젝트에 전체 접근 권한
- AUDITOR는 모든 프로젝트에 읽기 전용 접근 권한

### 사실 (Facts)

- 역할 정보는 `project.project_members` 테이블에 저장됨
- JWT는 프론트엔드 사용을 위한 프로젝트 역할 포함
- 역할 변경은 다음 API 호출 시 즉시 적용 (JWT 갱신 불필요)
- ReactiveProjectSecurityService가 모든 인가 검사 담당

### 금지 사항 (Prohibited)

- 컨트롤러에서 리포지토리 직접 접근
- 프로젝트 인가에 전역 `User.role` 검사 사용
- 비즈니스 로직에 역할 검사 하드코딩
- 인가 검사 없이 프로젝트 범위 데이터 접근

---

## 5. 엔드포인트별 권한

| 엔드포인트 | 메서드 | 필요 역할 |
|----------|--------|----------------|
| `/api/v2/projects` | GET | 인증됨 (멤버십 기준 필터링) |
| `/api/v2/projects/{id}` | GET | 프로젝트 멤버 |
| `/api/v2/projects/{id}` | PUT | PM, PMO_HEAD |
| `/api/v2/projects/{id}` | DELETE | PMO_HEAD |
| `/api/v2/projects/{id}/tasks` | POST | PM, DEVELOPER |
| `/api/v2/projects/{id}/tasks/{tid}` | DELETE | PM |
| `/api/v2/projects/{id}/issues` | POST | PM, DEVELOPER, QA, BA |
| `/api/v2/projects/{id}/deliverables` | POST | PM |
| `/api/v2/projects/{id}/members` | POST | PM, PMO_HEAD |

---

## 6. 관련 문서

| 문서 | 설명 |
|----------|-------------|
| [../07_security/access_control.md](../07_security/access_control.md) | 접근 제어 상세 |
| [../07_security/query_validation.md](../07_security/query_validation.md) | AI 쿼리 검증 보안 |

---

*최종 수정일: 2026-02-02*
