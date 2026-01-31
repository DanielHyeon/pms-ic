# Security Architecture

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- How does authentication work?
- How does authorization work?
- How is data isolated between projects?

---

## Documents in This Section

| Document | Purpose |
|----------|---------|
| [auth_model.md](./auth_model.md) | JWT authentication |
| [access_control.md](./access_control.md) | RBAC implementation |
| [data_isolation.md](./data_isolation.md) | Project-scoped data access |
| [audit_logging.md](./audit_logging.md) | Security audit trails |

---

## 1. Security Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Authentication Layer                             │
│                                                                     │
│  Login → JWT Token (24h) → Authorization Header                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Authorization Layer                              │
│                                                                     │
│  JWT → ProjectSecurityService → Project Membership Check            │
│                                                                     │
│  @PreAuthorize("@projectSecurity.hasRole(#projectId, 'PM')")       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Data Access Layer                                │
│                                                                     │
│  Service → Repository → Data (filtered by project)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Security Principles

### Authentication

| Aspect | Implementation |
|--------|----------------|
| Method | JWT (JSON Web Token) |
| Validity | 24 hours |
| Storage | Client-side (localStorage) |
| Refresh | Re-login required |

### Authorization

| Aspect | Implementation |
|--------|----------------|
| Model | Project-Scoped RBAC |
| System Roles | ADMIN, AUDITOR |
| Project Roles | PM, DEVELOPER, QA, etc. |
| Enforcement | Spring Security + SpEL |

### Data Isolation

| Aspect | Implementation |
|--------|----------------|
| Pattern | Tenant per project |
| Validation | Every API call validates project membership |
| Cross-project | Blocked except for system roles |

---

## 3. Security Rules

### Decisions

- Project roles are stored per-project in `project_members` table
- System ADMIN has access to all projects
- System AUDITOR has read-only access to all projects
- LLM Service has no database write access

### Prohibited

- Storing passwords in plain text
- Bypassing authorization checks
- Cross-project data access without system role
- Direct database queries from controllers
- Embedding secrets in code

### Required

- JWT for all authenticated endpoints
- Project membership check for project-scoped operations
- Audit logging for security-sensitive operations
- HTTPS for all communications (production)

---

## 4. Quick Reference

### JWT Structure

```json
{
  "sub": "user@example.com",
  "projectRoles": {
    "proj-001": "PM",
    "proj-002": "DEVELOPER"
  },
  "iat": 1706745600,
  "exp": 1706832000
}
```

### Authorization Annotation

```java
// Project-scoped authorization
@PreAuthorize("@projectSecurity.hasRole(#projectId, 'PM')")

// Multiple roles
@PreAuthorize("@projectSecurity.hasAnyRole(#projectId, 'PM', 'PMO_HEAD')")

// Membership only
@PreAuthorize("@projectSecurity.isProjectMember(#projectId)")
```

---

## 5. Related Documents

| Document | Description |
|----------|-------------|
| [../00_overview/user_roles.md](../00_overview/user_roles.md) | Role definitions |
| [../../docs/Project-Scoped-Authorization-Design.md](../Project-Scoped-Authorization-Design.md) | Full design doc |

---

*Last Updated: 2026-01-31*
