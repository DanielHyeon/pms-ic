# [Resource] API

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Version**: v1

<!-- affects: frontend, llm -->
<!-- requires-update: 04_frontend/api_binding.md -->

---

## Questions This Document Answers

- How do I interact with [resource]?
- What data can I send and receive?
- What permissions do I need?
- What errors can occur?

---

## Overview

### Base URL

```
/api/v1/[resource]
```

### Authentication

- **Required**: Yes / No
- **Method**: Bearer Token (JWT)
- **Scope**: Project-scoped / Global

---

## Endpoints

### GET /api/v1/[resource]

**Purpose**: Retrieve [resource] list

#### Request

**Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 0 | Page number |
| size | int | No | 20 | Items per page |
| sort | string | No | createdAt,desc | Sort field and direction |

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer {token} |
| X-Project-Id | Yes | Current project ID |

#### Response

**Success (200)**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "name": "string",
        "createdAt": "2026-01-31T00:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5
  },
  "error": null
}
```

**Field Specifications**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Unique identifier |
| name | String | No | Resource name |
| createdAt | ISO DateTime | No | Creation timestamp |

---

### POST /api/v1/[resource]

**Purpose**: Create new [resource]

#### Request

**Body**

```json
{
  "name": "string",       // required, max 100 chars
  "description": "string" // optional, max 500 chars
}
```

**Validation Rules**

| Field | Rule |
|-------|------|
| name | Required, 1-100 characters |
| description | Optional, max 500 characters |

#### Response

**Success (201)**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "createdAt": "2026-01-31T00:00:00Z"
  },
  "error": null
}
```

---

## Error Codes

| Code | HTTP Status | Meaning | User Message |
|------|-------------|---------|--------------|
| RESOURCE_NOT_FOUND | 404 | Resource does not exist | "Resource not found" |
| RESOURCE_DUPLICATE | 409 | Resource already exists | "Resource already exists" |
| VALIDATION_ERROR | 400 | Invalid request data | Varies by field |
| UNAUTHORIZED | 401 | Missing or invalid token | "Please log in" |
| FORBIDDEN | 403 | Insufficient permissions | "Access denied" |

**Error Response Format**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": {}
  }
}
```

---

## Permissions

| Endpoint | Required Role | Project Scope |
|----------|--------------|---------------|
| GET /resource | MEMBER+ | Yes |
| POST /resource | PM+ | Yes |
| PUT /resource/{id} | PM+ | Yes |
| DELETE /resource/{id} | ADMIN | Yes |

---

## Usage Examples

### cURL

```bash
# Get list
curl -X GET "http://localhost:8083/api/v1/resource?page=0&size=10" \
  -H "Authorization: Bearer {token}" \
  -H "X-Project-Id: {projectId}"

# Create
curl -X POST "http://localhost:8083/api/v1/resource" \
  -H "Authorization: Bearer {token}" \
  -H "X-Project-Id: {projectId}" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Resource"}'
```

---

## Rate Limiting

- **Limit**: 100 requests/minute per user
- **Header**: `X-RateLimit-Remaining`

---

## Related Documents

- [api_conventions.md](./api_conventions.md) - General API rules
- [error_codes.md](./error_codes.md) - Complete error code list
- [04_frontend/api_binding.md](../04_frontend/api_binding.md) - Frontend integration

---

*Swagger is a tool; this document is the decision evidence.*
