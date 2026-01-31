# User Roles and Permissions

> **Version**: 1.0 | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- What roles exist in the system?
- What can each role do?
- How does project-scoped authorization work?

---

## 1. Role Classification

### System Roles (Global)

| Role | Scope | Purpose |
|------|-------|---------|
| **ADMIN** | System-wide | Full system administration |
| **AUDITOR** | System-wide | Read-only access to all projects |

### Project Roles (Project-Scoped)

| Role | Scope | Purpose |
|------|-------|---------|
| **SPONSOR** | Per-project | Project funding and approval |
| **PMO_HEAD** | Per-project | PMO leadership and oversight |
| **PM** | Per-project | Project execution management |
| **DEVELOPER** | Per-project | Development tasks |
| **QA** | Per-project | Quality assurance |
| **BUSINESS_ANALYST** | Per-project | Requirements and user stories |
| **MEMBER** | Per-project | General membership |

---

## 2. Permission Matrix

| Permission | SPONSOR | PMO_HEAD | PM | DEVELOPER | QA | BA | MEMBER |
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

## 3. Authorization Implementation

### Project-Scoped Authorization Pattern

```java
// Controller annotation
@PreAuthorize("@projectSecurity.hasAnyRole(#projectId, 'PM', 'PMO_HEAD')")
public ResponseEntity<?> updateProject(@PathVariable String projectId, ...) {
    // ...
}
```

### Authorization Flow

```
Request → JWT Extraction → ProjectSecurityService
                              ↓
                   Check project_members table
                              ↓
              User's role on THIS project
                              ↓
                   Grant or Deny (403)
```

---

## 4. Key Rules

### Decisions

- A user can have DIFFERENT roles on different projects
- System roles (ADMIN, AUDITOR) bypass project-scoped checks
- ADMIN has full access to all projects
- AUDITOR has read-only access to all projects

### Facts

- Role information is stored in `project.project_members` table
- JWT contains project roles for frontend use
- Role changes take effect on next API call (no JWT refresh required)

### Prohibited

- Direct repository access from controllers
- Checking global `User.role` for project authorization
- Hardcoding role checks in business logic

---

## 5. Related Documents

| Document | Description |
|----------|-------------|
| [../07_security/auth_model.md](../07_security/auth_model.md) | Authentication model |
| [../07_security/access_control.md](../07_security/access_control.md) | Access control details |

---

*Last Updated: 2026-01-31*
