# Access Control

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: backend, api -->

---

## Questions This Document Answers

- How does project-scoped authorization work?
- What permissions does each role have?
- How are authorization decisions made?

---

## 1. Authorization Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Request Flow                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Request arrives with JWT                                         │
│     Authorization: Bearer eyJ...                                     │
│                                                                      │
│  2. JwtAuthenticationFilter extracts username                        │
│     SecurityContext.setAuthentication(user)                          │
│                                                                      │
│  3. @PreAuthorize evaluates SpEL expression                          │
│     @projectSecurity.hasRole(#projectId, 'PM')                      │
│                                                                      │
│  4. ProjectSecurityService queries project_members                   │
│     SELECT role FROM project_members WHERE project_id AND user_id   │
│                                                                      │
│  5. Decision: GRANT or DENY (403)                                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. ProjectSecurityService Methods

| Method | Purpose | Usage |
|--------|---------|-------|
| `hasRole(projectId, role)` | Check single role | `@projectSecurity.hasRole(#id, 'PM')` |
| `hasAnyRole(projectId, roles...)` | Check multiple roles | `@projectSecurity.hasAnyRole(#id, 'PM', 'PMO_HEAD')` |
| `isProjectMember(projectId)` | Check membership | `@projectSecurity.isProjectMember(#id)` |
| `hasSystemRole(role)` | Check system role | `@projectSecurity.hasSystemRole('ADMIN')` |

---

## 3. Implementation

### ProjectSecurityService

```java
@Service("projectSecurity")
@RequiredArgsConstructor
public class ProjectSecurityService {

    private final ProjectMemberRepository projectMemberRepository;

    public boolean hasAnyRole(String projectId, String... requiredRoles) {
        String userId = getCurrentUserId();
        if (userId == null) return false;

        // System admin bypass
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

### Controller Usage

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

## 4. Role Hierarchy

```
System Roles (bypass project checks):
├── ADMIN ──────────► All access
└── AUDITOR ────────► Read-only all projects

Project Roles (per-project):
├── SPONSOR
├── PMO_HEAD ───────► Project management
├── PM
├── DEVELOPER ──────► Execution
├── QA
├── BUSINESS_ANALYST
└── MEMBER ─────────► View only
```

---

## 5. Permission Matrix by Endpoint

| Endpoint | Method | Required Roles |
|----------|--------|----------------|
| `/projects` | GET | Authenticated (filtered) |
| `/projects/{id}` | GET | Member |
| `/projects/{id}` | PUT | PM, PMO_HEAD |
| `/projects/{id}` | DELETE | PMO_HEAD |
| `/projects/{id}/tasks` | POST | PM, DEVELOPER |
| `/projects/{id}/tasks/{tid}` | DELETE | PM |
| `/projects/{id}/issues` | POST | PM, DEVELOPER, QA, BA |
| `/projects/{id}/deliverables` | POST | PM |
| `/projects/{id}/members` | POST | PM, PMO_HEAD |

---

## 6. Error Responses

| Scenario | HTTP Code | Response |
|----------|-----------|----------|
| Missing JWT | 401 | `{"error": "Unauthorized"}` |
| Invalid JWT | 401 | `{"error": "Invalid token"}` |
| Not project member | 403 | `{"error": "Forbidden"}` |
| Insufficient role | 403 | `{"error": "Forbidden"}` |

---

*Last Updated: 2026-01-31*
