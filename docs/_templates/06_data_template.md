# [Entity/Schema] Data Documentation

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Author**: [Name]

<!-- affects: backend, llm -->
<!-- requires-update: 03_backend/domain_model.md -->

---

## Questions This Document Answers

- What does this data mean (not just structure)?
- How is data created, used, and disposed?
- How does this relate to other data?
- How is this data used in RAG/AI?

---

## 1. Data Overview

### Purpose

<!-- What business concept does this data represent? -->

### Semantic Meaning

| Field | Business Meaning | NOT Just |
|-------|-----------------|----------|
| status | Current workflow state | A string field |
| priority | Business urgency level | A number 1-5 |

---

## 2. Schema Definition

### PostgreSQL Table

```sql
CREATE TABLE [table_name] (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    [field_name] [type] [constraints],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_[table]_[field] ON [table_name]([field]);
```

### Field Specifications

| Field | Type | Nullable | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| id | UUID | No | gen_random_uuid() | PK | Unique identifier |
| name | VARCHAR(100) | No | - | - | Display name |
| status | VARCHAR(20) | No | 'DRAFT' | CHECK | Workflow state |

### Enum Values

| Field | Values | Description |
|-------|--------|-------------|
| status | DRAFT, ACTIVE, COMPLETED, ARCHIVED | Lifecycle states |

---

## 3. Entity Relationships

### Diagram

```
[Entity A] 1----* [This Entity] *----1 [Entity B]
                        |
                        *
                  [Child Entity]
```

### Relationship Details

| From | To | Cardinality | Cascade | Description |
|------|----|-------------|---------|-------------|
| Project | This | 1:N | Delete | Project owns items |
| This | Task | 1:N | Orphan | Tasks reference this |

### Foreign Keys

```sql
CONSTRAINT fk_[table]_project FOREIGN KEY (project_id)
    REFERENCES project(id) ON DELETE CASCADE
```

---

## 4. Data Lifecycle

### Creation

- **Created by**: [Service/Process]
- **Required data**: [List required fields]
- **Validation**: [Business rules]
- **Side effects**: [Events, notifications, etc.]

### Usage

- **Read by**: [List consumers]
- **Updated by**: [List modifiers]
- **Query patterns**: [Common access patterns]

### Disposal

- **Soft delete**: [Yes/No, field name]
- **Retention period**: [Duration]
- **Archive process**: [Description]
- **Cascade effects**: [What happens to related data]

---

## 5. Neo4j Graph Model (if applicable)

### Node Definition

```cypher
(:EntityName {
    id: "uuid",
    name: "string",
    properties...
})
```

### Relationships

```cypher
(:EntityA)-[:RELATES_TO {since: datetime}]->(:EntityB)
```

### Graph Queries

```cypher
// Common query pattern
MATCH (e:Entity)-[:RELATES_TO]->(related)
WHERE e.projectId = $projectId
RETURN e, related
```

---

## 6. Vector Store (for RAG)

### Embedding Configuration

| Field | Embedding Model | Chunk Size | Overlap |
|-------|-----------------|------------|---------|
| content | multilingual-e5-large | 512 | 50 |

### Metadata Stored

```json
{
  "source": "table_name",
  "entity_id": "uuid",
  "project_id": "uuid",
  "created_at": "timestamp",
  "document_type": "type"
}
```

### RAG Generation Process

1. Data change detected
2. Extract relevant text fields
3. Chunk if necessary
4. Generate embeddings
5. Store in vector DB with metadata

---

## 7. Data Quality Rules

### Integrity Constraints

| Rule | Enforcement | Violation Handling |
|------|-------------|-------------------|
| Unique name per project | DB constraint | Return error |
| Valid status transition | Application | Reject with reason |

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| name | 1-100 chars, no special chars | "Name must be..." |
| date | Future dates only | "Date must be in future" |

---

## 8. Migration Notes

### Current Version

- Schema version: [X]
- Last migration: [Date]

### Migration History

| Version | Date | Changes | Reversible |
|---------|------|---------|------------|
| 1 | YYYY-MM-DD | Initial schema | No |
| 2 | YYYY-MM-DD | Added [field] | Yes |

---

## Related Documents

- [03_backend/domain_model.md](../03_backend/domain_model.md) - Domain implementation
- [neo4j_model.md](./neo4j_model.md) - Graph schema
- [02_api/[resource].md](../02_api/[resource].md) - API for this data

---

*Data documentation describes meaning, not just tables.*
