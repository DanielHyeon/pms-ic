# Neo4j Graph Model

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: llm, data -->

---

## Questions This Document Answers

- What nodes and relationships exist in Neo4j?
- How is data indexed for RAG?
- What Cypher patterns are used?

---

## 1. Node Types (12)

### Entity Nodes

| Node Type | Properties | Source Table |
|-----------|------------|--------------|
| **Project** | id, name, status, progress | project.projects |
| **Phase** | id, name, status, progress, order_num | project.phases |
| **Sprint** | id, name, status, start_date, end_date | task.sprints |
| **Task** | id, title, status, priority, assignee_id | task.tasks |
| **UserStory** | id, title, story_points, status | task.user_stories |
| **Epic** | id, name, status, business_value | project.epics |
| **Feature** | id, name, status, priority | project.features |
| **WbsGroup** | id, code, name, status, progress | project.wbs_groups |
| **WbsItem** | id, code, name, status, progress | project.wbs_items |
| **User** | id, name, email, role | auth.users |
| **Deliverable** | id, name, type, status | project.deliverables |
| **Issue** | id, title, status, priority | project.issues |

### Document Nodes (RAG)

| Node Type | Properties | Purpose |
|-----------|------------|---------|
| **Document** | doc_id, title, file_type, created_at | Document metadata |
| **Chunk** | chunk_id, content, embedding, chunk_index | Text segments for RAG |

---

## 2. Relationship Types (17)

### Hierarchy Relationships

| Relationship | From | To | Meaning |
|--------------|------|----|----|
| HAS_PHASE | Project | Phase | Project contains phase |
| HAS_SPRINT | Project | Sprint | Project contains sprint |
| HAS_EPIC | Project | Epic | Project contains epic |
| HAS_FEATURE | Epic | Feature | Epic contains feature |
| HAS_WBS_GROUP | Phase | WbsGroup | Phase contains WBS group |
| HAS_WBS_ITEM | WbsGroup | WbsItem | WBS group contains item |
| HAS_TASK | Sprint | Task | Sprint contains task |
| HAS_STORY | Sprint | UserStory | Sprint contains story |
| HAS_DELIVERABLE | Phase | Deliverable | Phase has deliverable |

### Cross-linking Relationships

| Relationship | From | To | Meaning |
|--------------|------|----|----|
| BELONGS_TO_PHASE | Epic | Phase | Epic linked to phase |
| LINKED_TO_WBS_GROUP | Feature | WbsGroup | Feature linked to WBS |
| PART_OF | UserStory | Feature | Story part of feature |
| PART_OF | Task | UserStory | Task part of story |

### Dependency Relationships

| Relationship | From | To | Meaning |
|--------------|------|----|----|
| DEPENDS_ON | Task | Task | Task dependency |
| BLOCKED_BY | Task | Task | Blocking relationship |

### Assignment Relationships

| Relationship | From | To | Meaning |
|--------------|------|----|----|
| ASSIGNED_TO | Task | User | Task assigned to user |
| CREATED_BY | * | User | Creator tracking |

### Document Relationships

| Relationship | From | To | Meaning |
|--------------|------|----|----|
| HAS_CHUNK | Document | Chunk | Document has chunk |
| NEXT_CHUNK | Chunk | Chunk | Sequential ordering |
| BELONGS_TO | Document | Category | Document category |

---

## 3. Indexes

### Vector Index (RAG)

```cypher
CREATE VECTOR INDEX chunk_embeddings
FOR (c:Chunk) ON c.embedding
OPTIONS {
    indexConfig: {
        `vector.dimensions`: 1024,
        `vector.similarity_function`: 'cosine'
    }
}
```

### Fulltext Index (Keyword Search)

```cypher
CREATE FULLTEXT INDEX chunk_fulltext
FOR (c:Chunk) ON EACH [c.content, c.title]
```

### Uniqueness Constraints

```cypher
CREATE CONSTRAINT FOR (p:Project) REQUIRE p.id IS UNIQUE
CREATE CONSTRAINT FOR (ph:Phase) REQUIRE ph.id IS UNIQUE
CREATE CONSTRAINT FOR (t:Task) REQUIRE t.id IS UNIQUE
-- ... (one per node type)
```

---

## 4. Common Cypher Patterns

### Project Structure Query

```cypher
MATCH (p:Project {id: $projectId})
OPTIONAL MATCH (p)-[:HAS_PHASE]->(phase:Phase)
OPTIONAL MATCH (phase)-[:HAS_WBS_GROUP]->(wg:WbsGroup)
RETURN p, collect(DISTINCT phase), collect(DISTINCT wg)
```

### Task Dependencies

```cypher
MATCH (t:Task {id: $taskId})
OPTIONAL MATCH (t)-[:DEPENDS_ON]->(dep:Task)
OPTIONAL MATCH (t)<-[:BLOCKED_BY]-(blocker:Task)
RETURN t, collect(dep) as dependencies, collect(blocker) as blockers
```

### RAG Hybrid Search

```cypher
// Vector search
CALL db.index.vector.queryNodes('chunk_embeddings', 10, $embedding)
YIELD node, score as vec_score

// Keyword search
CALL db.index.fulltext.queryNodes('chunk_fulltext', $query)
YIELD node, score as kw_score

// Merge with RRF
WITH collect({node: node, vec: vec_score, kw: kw_score}) as results
// ... RRF calculation
```

---

## 5. Graph Visualization

```
(:Project)
    │
    ├──[:HAS_PHASE]──►(:Phase)
    │                     │
    │                     ├──[:HAS_WBS_GROUP]──►(:WbsGroup)
    │                     │                          │
    │                     │                          └──[:HAS_WBS_ITEM]──►(:WbsItem)
    │                     │
    │                     └──[:HAS_DELIVERABLE]──►(:Deliverable)
    │
    ├──[:HAS_SPRINT]──►(:Sprint)
    │                     │
    │                     ├──[:HAS_TASK]──►(:Task)──[:ASSIGNED_TO]──►(:User)
    │                     │                  │
    │                     │                  └──[:DEPENDS_ON]──►(:Task)
    │                     │
    │                     └──[:HAS_STORY]──►(:UserStory)
    │
    └──[:HAS_EPIC]──►(:Epic)
                        │
                        └──[:HAS_FEATURE]──►(:Feature)
```

---

*Last Updated: 2026-01-31*
