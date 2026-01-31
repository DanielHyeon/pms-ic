# API Conventions

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: api, frontend, backend -->

---

## Questions This Document Answers

- What rules govern API design?
- How should requests/responses be formatted?
- What HTTP methods are used for what?

---

## 1. URL Conventions

### Resource Naming

| Rule | Example |
|------|---------|
| Plural nouns | `/projects`, `/tasks`, `/users` |
| Lowercase with hyphens | `/user-stories`, `/wbs-groups` |
| Nested resources | `/projects/{id}/phases/{phaseId}` |
| No verbs in URL | Use HTTP methods instead |

### Path Parameters

```
/api/projects/{projectId}/tasks/{taskId}

projectId: UUID or string identifier
taskId: UUID or string identifier
```

### Query Parameters

```
GET /api/projects?status=ACTIVE&page=0&size=20&sort=createdAt,desc
```

| Parameter | Purpose | Default |
|-----------|---------|---------|
| `page` | Page number (0-indexed) | 0 |
| `size` | Page size | 20 |
| `sort` | Sort field and direction | varies |
| Filter params | Resource-specific filters | - |

---

## 2. HTTP Methods

| Method | Purpose | Idempotent | Request Body |
|--------|---------|------------|--------------|
| `GET` | Read resource(s) | Yes | No |
| `POST` | Create resource | No | Yes |
| `PUT` | Full update | Yes | Yes |
| `PATCH` | Partial update | Yes | Yes |
| `DELETE` | Remove resource | Yes | No |

### Method Selection Rules

| Action | Method | Example |
|--------|--------|---------|
| List resources | GET | `GET /projects` |
| Get single resource | GET | `GET /projects/123` |
| Create new | POST | `POST /projects` |
| Replace entire | PUT | `PUT /projects/123` |
| Update fields | PATCH | `PATCH /projects/123` |
| Delete | DELETE | `DELETE /projects/123` |
| Custom action | POST | `POST /projects/123/archive` |

---

## 3. Request Format

### Content-Type

```http
Content-Type: application/json
```

### Request Body Example

```json
{
  "name": "New Project",
  "description": "Project description",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30"
}
```

### Date Format

ISO 8601: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`

---

## 4. Response Format

### Standard Response Wrapper

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

### Pagination Response

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

## 5. HTTP Status Codes

### Success Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | GET, PUT, PATCH success |
| 201 | Created | POST success |
| 204 | No Content | DELETE success |

### Error Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 400 | Bad Request | Invalid request body |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Server error |

---

## 6. Error Response Format

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

## 7. Field Naming

### JSON Fields

| Convention | Example |
|------------|---------|
| camelCase | `projectId`, `createdAt` |
| Boolean prefix | `isActive`, `hasChildren` |
| Date suffix | `createdAt`, `updatedAt` |
| ID suffix | `projectId`, `userId` |

### Nullable Fields

```json
{
  "description": "Some text",
  "assigneeId": null
}
```

Nullable fields MUST be documented in API specs.

---

## 8. Versioning Strategy

### Current State

No explicit versioning (implicit v1).

### Future Strategy

```
/api/v2/projects
```

Breaking changes require new version.

---

## 9. Decisions

- REST + JSON for all APIs
- camelCase for JSON fields
- Project-scoped authorization on all project endpoints
- Pagination for all list endpoints

## 10. Prohibited

- Verbs in URL paths (use methods)
- snake_case in JSON fields
- Returning raw database errors
- Exposing internal IDs in URLs

---

*Last Updated: 2026-01-31*
