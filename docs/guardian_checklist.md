# Guardian Checklist

> **Version**: 1.0 | **Last Updated**: 2026-01-31

---

## Purpose

This checklist ensures that code changes trigger appropriate documentation updates.
When your change matches a condition below, the corresponding documents MUST be reviewed.

---

## 1. API Changes

### Conditions

- Request / Response field added, deleted, or meaning changed
- Nullable policy changed
- Error code changed or added
- New endpoint added

### Required Documents

- [ ] `docs/02_api/` - API specification
- [ ] `docs/04_frontend/` - Frontend API bindings
- [ ] `docs/99_decisions/` - If breaking change, create ADR

---

## 2. Database / Data Model Changes

### Conditions

- Table or column added/deleted
- Status values (enum) changed
- Neo4j node or relationship changed
- Index added/removed

### Required Documents

- [ ] `docs/06_data/` - Data schema docs
- [ ] `docs/03_backend/` - Domain model docs
- [ ] Migration file with description comment

---

## 3. Business Logic Changes

### Conditions

- State transition rules changed
- Calculation criteria changed
- Automation logic added/removed
- Validation rules modified

### Required Documents

- [ ] `docs/03_backend/` - Backend docs
- [ ] `docs/01_architecture/` - If architectural impact
- [ ] `docs/99_decisions/` - Create ADR for significant changes

---

## 4. LLM / AI Behavior Changes

### Conditions

- Prompt changed or restructured
- Tool calling conditions changed
- RAG source or scope changed
- Trust level modified
- Model changed

### Required Documents

- [ ] `docs/05_llm/` - LLM documentation
- [ ] `docs/01_architecture/` - If system boundaries affected
- [ ] `docs/99_decisions/` - Create ADR

---

## 5. Authorization / Security Changes

### Conditions

- Access level changed
- Project scope policy modified
- Admin permission added
- Authentication flow changed

### Required Documents

- [ ] `docs/07_security/` - Security documentation
- [ ] `docs/02_api/` - API auth requirements
- [ ] Audit log policy review

---

## 6. Infrastructure / Operations Changes

### Conditions

- Docker configuration changed
- Environment variable added/removed
- Port or service endpoint changed
- New dependency added

### Required Documents

- [ ] `docs/08_operations/` - Operations docs
- [ ] `.env.example` - Update example
- [ ] `README.md` - If affects quick start

---

## Guardian Approval Criteria

Documents don't need to be "perfect" but they MUST NOT be false.

- "TBD" or "To be decided" is acceptable
- Outdated information is NOT acceptable
- Missing critical information is NOT acceptable

---

## Change Type to Document Mapping (Quick Reference)

| Change Type | Review These Docs |
|-------------|-------------------|
| API Request/Response | 02_api/, 04_frontend/ |
| DB Schema | 06_data/, 03_backend/ |
| LLM Prompt | 05_llm/, 99_decisions/ |
| Auth/Permissions | 07_security/, 02_api/ |
| Service Split/Merge | 01_architecture/, 99_decisions/ |
| New Feature | 00_overview/, relevant area docs |

---

*This checklist should be reviewed on every PR.*
