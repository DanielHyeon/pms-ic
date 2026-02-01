# Documentation Templates

> **Purpose**: Standardized templates for consistent documentation across all categories

---

## Available Templates

| Template | Use For | Category |
|----------|---------|----------|
| [00_overview_template.md](./00_overview_template.md) | Project/feature overviews | 00_overview/ |
| [01_architecture_template.md](./01_architecture_template.md) | System architecture docs | 01_architecture/ |
| [02_api_template.md](./02_api_template.md) | API endpoint documentation | 02_api/ |
| [03_backend_template.md](./03_backend_template.md) | Backend module docs | 03_backend/ |
| [04_frontend_template.md](./04_frontend_template.md) | Frontend component docs | 04_frontend/ |
| [05_llm_template.md](./05_llm_template.md) | LLM/AI feature docs | 05_llm/ |
| [06_data_template.md](./06_data_template.md) | Data model docs | 06_data/ |
| [07_security_template.md](./07_security_template.md) | Security documentation | 07_security/ |
| [08_operations_template.md](./08_operations_template.md) | Operations/deployment docs | 08_operations/ |
| [99_decisions_adr_template.md](./99_decisions_adr_template.md) | Architecture Decision Records | 99_decisions/ |

---

## How to Use

### 1. Copy Template

```bash
cp docs/_templates/02_api_template.md docs/02_api/[resource].md
```

### 2. Fill Required Sections

Each template has:
- **Questions This Document Answers**: Start here - define what you're documenting
- **Metadata**: Status, date, author, affects tags
- **Content sections**: Fill based on your specific content

### 3. Add Impact Tags

```markdown
<!-- affects: api, frontend, llm -->
<!-- requires-update: 04_frontend/api_binding.md -->
```

### 4. Link Related Documents

Always link to:
- Related ADRs
- Upstream/downstream docs
- API/implementation pairs

---

## Template Conventions

### Status Values

- **Draft**: Work in progress, incomplete
- **Review**: Ready for review, may change
- **Final**: Production-ready, stable

### Required Elements

Every document MUST have:

1. **Questions section**: What does this doc answer?
2. **Status metadata**: Current document state
3. **Affects tags**: Impact analysis for changes
4. **Related documents**: Cross-references

### LLM-Friendly Rules

1. **Question-centric**: Start with questions, not descriptions
2. **Decision vs Fact**: Separate what was decided from what is true
3. **Explicit rules**: State what's allowed AND forbidden
4. **Evidence**: Cite sources for claims

---

## Creating New Document Types

If you need a template not listed here:

1. Base it on the closest existing template
2. Include all required elements
3. Add to this README
4. Update guardian_checklist.md if new review rules apply

---

## Maintenance

When updating templates:

1. All existing documents remain valid
2. New documents should use updated templates
3. Document the change in template version comments

---

*Templates ensure consistent, LLM-friendly documentation.*
