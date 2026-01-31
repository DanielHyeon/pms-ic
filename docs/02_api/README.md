# API Documentation

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- What APIs exist and how do I call them?
- What are the request/response formats?
- What errors can occur?
- What authentication is required?

---

## Documents in This Section

| Document | Purpose |
|----------|---------|
| [api_conventions.md](./api_conventions.md) | API design rules |
| [auth.md](./auth.md) | Authentication endpoints |
| [error_codes.md](./error_codes.md) | Error code reference |
| [rest/](./rest/) | REST endpoint documentation |
| [sse_websocket.md](./sse_websocket.md) | Real-time streaming |

---

## 1. API Overview

### Base URLs

| Environment | Backend | LLM Service |
|-------------|---------|-------------|
| Development | `http://localhost:8083` | `http://localhost:8000` |
| Docker | `http://backend:8083` | `http://llm-service:8000` |

### API Prefix

All REST endpoints: `/api/**`

---

## 2. Authentication

### JWT Token

All authenticated endpoints require:

```http
Authorization: Bearer <jwt-token>
```

### Token Acquisition

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "User Name",
    "systemRole": null
  },
  "projectRoles": [
    {
      "projectId": "proj-001",
      "projectName": "Insurance Claims System",
      "role": "pm"
    }
  ]
}
```

---

## 3. Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

---

## 4. API Categories

### Core APIs (Backend)

| Category | Base Path | Description |
|----------|-----------|-------------|
| Auth | `/api/auth/*` | Authentication, user management |
| Projects | `/api/projects/*` | Project CRUD, members |
| Phases | `/api/projects/{id}/phases/*` | Phase management |
| WBS | `/api/projects/{id}/wbs/*` | Work breakdown structure |
| Tasks | `/api/projects/{id}/tasks/*` | Task/Kanban management |
| Sprints | `/api/projects/{id}/sprints/*` | Sprint management |
| Issues | `/api/projects/{id}/issues/*` | Issue tracking |
| Deliverables | `/api/projects/{id}/deliverables/*` | Deliverable management |
| Chat | `/api/chat/*` | AI chat sessions |
| Reports | `/api/reports/*` | Report generation |

### AI APIs (LLM Service)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/v2` | POST | Chat with AI (Two-Track) |
| `/api/chat/stream` | POST | SSE streaming chat |
| `/api/rag/index` | POST | Index document for RAG |
| `/api/rag/documents/{id}` | DELETE | Remove from RAG |
| `/health` | GET | Service health check |

---

## 5. Authorization Rules

### Endpoint Authorization

| Pattern | Required Authorization |
|---------|----------------------|
| `/api/auth/*` | Public (login, register) |
| `/api/projects` (GET) | Authenticated (filtered by membership) |
| `/api/projects/{id}/*` | Project membership required |
| `/api/admin/*` | System ADMIN role |

### Project-Scoped Endpoints

```
All /api/projects/{projectId}/* endpoints require:
1. Valid JWT token
2. User must be member of the project
3. User's project role must match endpoint requirements
```

---

## 6. Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Auth endpoints | 10 req/min |
| Chat endpoints | 20 req/min |
| Standard APIs | 100 req/min |

---

## 7. Versioning

Current API version: **v1** (implicit)

Future versioning pattern: `/api/v2/*`

---

## 8. Related Documents

| Document | Description |
|----------|-------------|
| [../07_security/](../07_security/) | Security architecture |
| [../01_architecture/](../01_architecture/) | System architecture |

---

*Last Updated: 2026-01-31*
