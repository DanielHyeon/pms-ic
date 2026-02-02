# PMS-IC Documentation Index

**Project**: Insurance Claims Project Management System with AI Support
**Status**: Production Ready
**Last Updated**: 2026-01-31

---

## Documentation Structure (NEW)

Documents are organized by **questions they answer**, not by type.

```
/docs
├── 00_overview/      "What is this project?"
├── 01_architecture/  "Why is it built this way?"
├── 02_api/           "How do I call the APIs?"
├── 03_backend/       "How does the server work?"
├── 04_frontend/      "How does the UI work?"
├── 05_llm/           "What does AI do?"
├── 06_data/          "Where is data stored?"
├── 07_security/      "How is it secured?"
├── 08_operations/    "How do I run it?"
└── 99_decisions/     "Why did we decide this?"
```

---

## Quick Navigation (New Structure)

| Section | Purpose | Entry Point |
|---------|---------|-------------|
| **00_overview** | Project purpose, scope, users | [README.md](./00_overview/README.md) |
| **01_architecture** | System design rationale | [README.md](./01_architecture/README.md) |
| **02_api** | API conventions, endpoints, errors | [README.md](./02_api/README.md) |
| **03_backend** | Backend modules, domain model, reactive patterns | [README.md](./03_backend/README.md) |
| **04_frontend** | Frontend components, state management, API binding | [README.md](./04_frontend/README.md) |
| **05_llm** | AI/LLM scope and behavior | [README.md](./05_llm/README.md) |
| **06_data** | Database schemas, data flow | [README.md](./06_data/README.md) |
| **07_security** | Authentication, authorization | [README.md](./07_security/README.md) |
| **08_operations** | Deployment, monitoring | [README.md](./08_operations/README.md) |
| **99_decisions** | Architecture Decision Records | [README.md](./99_decisions/README.md) |

### Operational Documents

| Document | Purpose |
|----------|---------|
| [guardian_checklist.md](./guardian_checklist.md) | Code change → Document update mapping |
| [../.github/pull_request_template.md](../.github/pull_request_template.md) | PR template with doc checklist |

---

## Implementation Status

| Component | Status | Coverage |
|-----------|--------|----------|
| Frontend | Complete | 26 pages, 23 hooks |
| Backend API | Complete | 38 controllers, 150+ endpoints |
| Database | Complete | 54 tables (PostgreSQL) + Neo4j |
| LLM Service | Complete | 6 agents, 10 skills, 5 workflows |
| Security (RBAC) | Complete | Project-Scoped Authorization |

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + TypeScript + Vite | React 18, Vite 5 |
| Backend | Spring Boot + WebFlux + R2DBC | Spring Boot 3.5, Java 21 |
| LLM Service | Flask + LangGraph | Python 3.11 |
| Database | PostgreSQL (R2DBC) | 15 |
| Graph DB | Neo4j (Outbox Pattern) | 5.20 |
| Cache | Redis (Reactive) | 7 |

---

## Quick Start

```bash
# Start all services
docker-compose up -d

# Service URLs
# Frontend:    http://localhost:5173
# Backend:     http://localhost:8083
# LLM Service: http://localhost:8000
# Neo4j:       http://localhost:7474
```

---

## Document Conventions

### Writing Rules (LLM-Friendly)

1. **Question-centered structure**: Start each doc with "Questions This Document Answers"
2. **Separate decisions from facts**: Use "Decisions" and "Facts" sections
3. **Explicit prohibitions**: Always mark what's NOT allowed
4. **Change impact tags**: Use `<!-- affects: api, frontend, llm -->` comments
5. **Evidence sources**: Link to related ADRs and code

### Status Indicators

- **Final**: Production-ready documentation
- **Reference**: Implementation guidance, working documents
- **Planned**: Future implementation

### Naming

- **English**: lowercase with hyphens (e.g., `service-boundaries.md`)
- **Korean**: Original titles preserved
- **Directories**: XX_category format (e.g., `00_overview/`)

---

## Contributing

1. Check [guardian_checklist.md](./guardian_checklist.md) for required doc updates
2. Use the PR template with documentation checklist
3. Create ADR for significant architecture decisions
4. Update this index when adding new documents

---

*Last Updated: 2026-01-31*
