# 접근 제어

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: backend, api, security -->

---

## 이 문서가 답하는 질문

- 프로젝트 범위 인가는 어떻게 동작하는가?
- 각 역할에는 어떤 권한이 있는가?
- 인가 결정은 어떻게 이루어지는가?

---

## 1. 인가 흐름

```
+--------------------------------------------------------------------+
|                         요청 흐름                                    |
+--------------------------------------------------------------------+
|                                                                     |
|  1. JWT와 함께 요청 도착                                             |
|     Authorization: Bearer eyJ...                                    |
|                                                                     |
|  2. JwtAuthenticationFilter가 사용자명 추출                          |
|     SecurityContext.setAuthentication(user)                         |
|                                                                     |
|  3. @PreAuthorize가 SpEL 표현식 평가                                 |
|     @projectSecurity.hasRole(#projectId, 'PM')                     |
|                                                                     |
|  4. ProjectSecurityService가 project_members 쿼리                   |
|     SELECT role FROM project_members WHERE project_id AND user_id  |
|                                                                     |
|  5. 결정: 허용 또는 거부 (403)                                       |
|                                                                     |
+--------------------------------------------------------------------+
```

---

## 2. ProjectSecurityService 메서드

| 메서드 | 목적 | 사용법 |
|--------|------|--------|
| `hasRole(projectId, role)` | 단일 역할 확인 | `@projectSecurity.hasRole(#id, 'PM')` |
| `hasAnyRole(projectId, roles...)` | 다중 역할 확인 | `@projectSecurity.hasAnyRole(#id, 'PM', 'PMO_HEAD')` |
| `isProjectMember(projectId)` | 멤버십 확인 | `@projectSecurity.isProjectMember(#id)` |
| `hasSystemRole(role)` | 시스템 역할 확인 | `@projectSecurity.hasSystemRole('ADMIN')` |

---

## 3. 구현

### ProjectSecurityService

```java
@Service("projectSecurity")
@RequiredArgsConstructor
public class ProjectSecurityService {

    private final ProjectMemberRepository projectMemberRepository;

    public boolean hasAnyRole(String projectId, String... requiredRoles) {
        String userId = getCurrentUserId();
        if (userId == null) return false;

        // 시스템 관리자 우회
        if (hasSystemRole("ADMIN")) return true;

        Optional<ProjectMember> member = projectMemberRepository
            .findByProjectIdAndUserIdAndActiveTrue(projectId, userId);

        if (member.isEmpty()) return false;

        String userRole = member.get().getRole().name();
        return Arrays.asList(requiredRoles).contains(userRole);
    }

    public boolean isProjectMember(String projectId) {
        String userId = getCurrentUserId();
        if (userId == null) return false;

        if (hasSystemRole("ADMIN") || hasSystemRole("AUDITOR")) return true;

        return projectMemberRepository
            .existsByProjectIdAndUserIdAndActiveTrue(projectId, userId);
    }
}
```

### 컨트롤러 사용법

```java
@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
public class TaskController {

    @PostMapping
    @PreAuthorize("@projectSecurity.hasAnyRole(#projectId, 'PM', 'DEVELOPER')")
    public Mono<TaskDto> createTask(
        @PathVariable String projectId,
        @RequestBody TaskDto taskDto
    ) {
        return taskService.create(projectId, taskDto);
    }

    @DeleteMapping("/{taskId}")
    @PreAuthorize("@projectSecurity.hasRole(#projectId, 'PM')")
    public Mono<Void> deleteTask(
        @PathVariable String projectId,
        @PathVariable String taskId
    ) {
        return taskService.delete(projectId, taskId);
    }
}
```

---

## 4. 역할 계층

```
시스템 역할 (프로젝트 확인 우회):
+-- ADMIN ----------> 모든 접근
+-- AUDITOR --------> 모든 프로젝트 읽기 전용

프로젝트 역할 (프로젝트별):
+-- SPONSOR
+-- PMO_HEAD -------> 프로젝트 관리
+-- PM
+-- DEVELOPER ------> 실행
+-- QA
+-- BUSINESS_ANALYST
+-- MEMBER ---------> 조회 전용
```

---

## 5. 엔드포인트별 권한 매트릭스

| 엔드포인트 | 메서드 | 필요 역할 |
|------------|--------|----------|
| `/projects` | GET | 인증됨 (필터링됨) |
| `/projects/{id}` | GET | 멤버 |
| `/projects/{id}` | PUT | PM, PMO_HEAD |
| `/projects/{id}` | DELETE | PMO_HEAD |
| `/projects/{id}/tasks` | POST | PM, DEVELOPER |
| `/projects/{id}/tasks/{tid}` | DELETE | PM |
| `/projects/{id}/issues` | POST | PM, DEVELOPER, QA, BA |
| `/projects/{id}/deliverables` | POST | PM |
| `/projects/{id}/members` | POST | PM, PMO_HEAD |

---

## 6. 오류 응답

| 시나리오 | HTTP 코드 | 응답 |
|----------|-----------|------|
| JWT 누락 | 401 | `{"error": "Unauthorized"}` |
| 유효하지 않은 JWT | 401 | `{"error": "Invalid token"}` |
| 프로젝트 멤버 아님 | 403 | `{"error": "Forbidden"}` |
| 역할 부족 | 403 | `{"error": "Forbidden"}` |

---

## 7. 보안 검증 체크리스트

### 코드 리뷰 시 확인 사항

- [ ] 모든 프로젝트 범위 엔드포인트에 `@PreAuthorize` 적용
- [ ] 서비스 계층에서 projectId 검증
- [ ] 교차 프로젝트 쿼리 방지
- [ ] 민감 데이터 필터링

### 금지된 패턴

```java
// 금지: 인가 없이 직접 쿼리
repository.findById(taskId);

// 올바름: 프로젝트 범위로 쿼리
repository.findByIdAndProjectId(taskId, projectId);
```

---

## 8. 관련 문서

| 문서 | 설명 |
|------|------|
| [README.md](./README.md) | 보안 아키텍처 개요 |
| [query_validation.md](./query_validation.md) | LLM 쿼리 검증 |

---

*최종 수정일: 2026-02-02*
