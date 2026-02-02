# [Feature/Area] Security Documentation

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Author**: [Name]
> **Security Review**: [Reviewer] on [Date]

<!-- affects: api, backend, frontend -->
<!-- requires-update: 02_api/auth.md -->

---

## Questions This Document Answers

- How is authentication handled?
- Who can access what?
- How is data isolated?
- What is audited?

---

## 1. Authentication

### Method

- **Type**: JWT Bearer Token
- **Issuer**: [Service name]
- **Expiration**: 24 hours
- **Refresh**: [Strategy]

### Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["ADMIN", "PM"],
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Authentication Flow

```
1. User submits credentials
2. Backend validates against [auth source]
3. JWT generated and returned
4. Client stores in [location]
5. Client sends in Authorization header
```

---

## 2. Authorization Model

### Role Hierarchy

```
ADMIN
  └── AUDITOR (read-only global)
  └── SPONSOR
      └── PMO_HEAD
          └── PM
              └── DEVELOPER
              └── QA
              └── BUSINESS_ANALYST
                  └── MEMBER
```

### Permission Matrix

| Resource | MEMBER | DEVELOPER | PM | ADMIN |
|----------|--------|-----------|----|----- -|
| View project | X | X | X | X |
| Edit project | - | - | X | X |
| Delete project | - | - | - | X |
| View tasks | X | X | X | X |
| Create tasks | - | X | X | X |

### Project Scope

- All permissions are project-scoped
- User must be project member to access
- `X-Project-Id` header required for all requests

---

## 3. Access Control Implementation

### Annotation Pattern

```java
@PreAuthorize("@projectSecurity.hasRole(#projectId, 'PM')")
public Mono<Response> updateProject(UUID projectId, Request request) {
    // ...
}
```

### Security Service

```java
// ProjectSecurityService methods
boolean hasRole(UUID projectId, String role)
boolean hasAnyRole(UUID projectId, String... roles)
boolean isProjectMember(UUID projectId)
```

---

## 4. Data Isolation

### Tenant Isolation

| Data Type | Isolation Level | Enforcement |
|-----------|-----------------|-------------|
| Project data | Project ID | Row-level filter |
| User data | User ID | Query filter |
| Shared data | Read-only | No modification |

### Query Patterns

```java
// Always filter by project
repository.findByProjectId(projectId)

// Never expose cross-project queries
// FORBIDDEN: repository.findAll()
```

---

## 5. Input Validation

### Validation Rules

| Input | Validation | Sanitization |
|-------|------------|--------------|
| User input | Length, format | HTML escape |
| File upload | Type, size | Virus scan |
| API params | Type, range | None needed |

### Injection Prevention

- **SQL**: Parameterized queries only (R2DBC)
- **XSS**: React auto-escaping + CSP headers
- **Command**: No shell execution from user input

---

## 6. Sensitive Data Handling

### Classification

| Data Type | Classification | Storage | Transmission |
|-----------|---------------|---------|--------------|
| Passwords | Critical | Hashed (bcrypt) | HTTPS only |
| JWT tokens | Sensitive | Memory only | HTTPS only |
| User PII | Sensitive | Encrypted at rest | HTTPS only |

### Data Masking

```java
// Log masking
log.info("User {} logged in", maskEmail(email));

// Response masking
response.setEmail(maskEmail(user.getEmail()));
```

---

## 7. Audit Logging

### Audited Actions

| Action | Log Level | Data Captured |
|--------|-----------|---------------|
| Login success | INFO | User ID, timestamp, IP |
| Login failure | WARN | Attempted email, IP |
| Permission denied | WARN | User, resource, action |
| Data modification | INFO | User, entity, changes |

### Audit Log Format

```json
{
  "timestamp": "2026-01-31T12:00:00Z",
  "action": "UPDATE",
  "userId": "uuid",
  "resource": "Project",
  "resourceId": "uuid",
  "changes": {"field": {"old": "x", "new": "y"}},
  "ip": "192.168.1.1"
}
```

### Retention

- **Duration**: 2 years
- **Storage**: Separate audit database
- **Access**: ADMIN and AUDITOR only

---

## 8. Security Headers

### Required Headers

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000
```

### CORS Configuration

```java
allowedOrigins: ["https://app.example.com"]
allowedMethods: ["GET", "POST", "PUT", "DELETE"]
allowCredentials: true
```

---

## 9. Threat Mitigation

### Known Threats

| Threat | Mitigation | Status |
|--------|------------|--------|
| Brute force login | Rate limiting, account lockout | Implemented |
| Session hijacking | HTTPS, secure cookies, short expiry | Implemented |
| CSRF | SameSite cookies, CSRF tokens | Implemented |

### Incident Response

1. Detect: [Monitoring/alerting method]
2. Contain: [Immediate actions]
3. Investigate: [Analysis steps]
4. Remediate: [Fix process]
5. Report: [Communication plan]

---

## Related Documents

- [02_api/auth.md](../02_api/auth.md) - Auth API specification
- [access_control.md](./access_control.md) - Detailed RBAC rules
- [ADR-XXX](../99_decisions/ADR-XXX.md) - Security decisions

---

*Security documentation must exist from day 1, not added later.*
