# Error Codes Reference

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: api, frontend -->

---

## Questions This Document Answers

- What error codes can the API return?
- What does each error code mean?
- How should the frontend handle each error?

---

## 1. Error Response Structure

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

## 2. Authentication Errors (401)

| Code | Message | User Action |
|------|---------|-------------|
| `UNAUTHORIZED` | Authentication required | Redirect to login |
| `INVALID_TOKEN` | Token is invalid or expired | Redirect to login |
| `TOKEN_EXPIRED` | Token has expired | Redirect to login |
| `INVALID_CREDENTIALS` | Invalid email or password | Show error, retry |

---

## 3. Authorization Errors (403)

| Code | Message | User Action |
|------|---------|-------------|
| `FORBIDDEN` | Access denied | Show permission error |
| `NOT_PROJECT_MEMBER` | Not a member of this project | Contact PM |
| `INSUFFICIENT_ROLE` | Role does not have permission | Contact PM |

---

## 4. Validation Errors (400, 422)

| Code | Message | User Action |
|------|---------|-------------|
| `VALIDATION_ERROR` | Request validation failed | Fix form inputs |
| `INVALID_FORMAT` | Invalid data format | Fix input format |
| `MISSING_FIELD` | Required field is missing | Fill required field |
| `INVALID_DATE_RANGE` | End date before start date | Fix date range |

### Validation Error Details

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

## 5. Resource Errors (404, 409)

| Code | Message | User Action |
|------|---------|-------------|
| `NOT_FOUND` | Resource not found | Navigate away |
| `PROJECT_NOT_FOUND` | Project does not exist | Go to project list |
| `TASK_NOT_FOUND` | Task does not exist | Refresh page |
| `DUPLICATE_RESOURCE` | Resource already exists | Use different name |
| `CONFLICT` | Resource state conflict | Refresh and retry |

---

## 6. Business Logic Errors (422)

| Code | Message | User Action |
|------|---------|-------------|
| `PHASE_NOT_READY` | Phase gate not approved | Complete gate review |
| `SPRINT_ACTIVE` | Cannot modify active sprint | Wait or contact PM |
| `DELIVERABLE_LOCKED` | Deliverable is locked | Contact approver |
| `MAX_WIP_REACHED` | WIP limit reached | Complete existing tasks |

---

## 7. AI/Chat Errors

| Code | Message | User Action |
|------|---------|-------------|
| `AI_SERVICE_UNAVAILABLE` | AI service temporarily unavailable | Retry later |
| `AI_TIMEOUT` | AI response timed out | Retry or simplify query |
| `NO_CONTEXT_FOUND` | No relevant documents found | Rephrase question |
| `OUT_OF_SCOPE` | Question outside system scope | Ask different question |

---

## 8. Server Errors (500)

| Code | Message | User Action |
|------|---------|-------------|
| `INTERNAL_ERROR` | Internal server error | Report to admin |
| `DATABASE_ERROR` | Database operation failed | Retry later |
| `SERVICE_ERROR` | External service error | Retry later |

---

## 9. Frontend Error Handling

### Recommended Handling

```typescript
switch (error.code) {
  case 'UNAUTHORIZED':
  case 'INVALID_TOKEN':
  case 'TOKEN_EXPIRED':
    // Redirect to login
    redirectToLogin();
    break;

  case 'FORBIDDEN':
  case 'NOT_PROJECT_MEMBER':
    // Show permission error
    showPermissionError(error.message);
    break;

  case 'VALIDATION_ERROR':
    // Show field-level errors
    showFieldErrors(error.details);
    break;

  case 'NOT_FOUND':
    // Navigate away or show not found
    showNotFound();
    break;

  case 'AI_SERVICE_UNAVAILABLE':
  case 'AI_TIMEOUT':
    // Show AI fallback message
    showAIFallback();
    break;

  default:
    // Generic error
    showGenericError(error.message);
}
```

---

## 10. Error Code Registry

All error codes must be:
1. Uppercase with underscores
2. Descriptive of the error
3. Documented in this file
4. Consistent across endpoints

Adding new codes requires updating this document.

---

*Last Updated: 2026-01-31*
