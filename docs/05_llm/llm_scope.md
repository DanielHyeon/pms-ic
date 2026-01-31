# LLM Usage Scope

> **Version**: 2.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: llm, backend, frontend -->

---

## Questions This Document Answers

- What tasks can AI perform?
- What tasks must AI NOT perform?
- How reliable are AI responses?

---

## 1. AI Capabilities

### What AI Does

| Function | Authority | Description |
|----------|-----------|-------------|
| Query Understanding | SUGGEST | Parse natural language to structured query |
| Document Search | EXECUTE | Find relevant chunks via RAG |
| Status Summarization | SUGGEST | Summarize project/sprint status |
| Report Draft Generation | SUGGEST | Generate report content for review |
| Knowledge Q&A | SUGGEST | Answer questions from indexed docs |
| Intent Classification | EXECUTE | Route to appropriate workflow |

### Examples of Valid AI Responses

```
User: "Show me overdue tasks"
AI: Queries DB via tool call, returns factual list

User: "Summarize this sprint"
AI: Generates summary from DB data + context

User: "What is planning poker?"
AI: Retrieves definition from indexed documents
```

---

## 2. AI Prohibitions

### What AI Must NOT Do

| Prohibited Action | Reason | Enforcement |
|-------------------|--------|-------------|
| Make authorization decisions | Security-critical | Code-level block |
| Modify database directly | Data integrity | No write access |
| Calculate financial values | Accuracy required | Block in prompt |
| Determine task completion | Business decision | Require human |
| Delete any data | Irreversible | No delete capability |

### Examples of Invalid AI Actions

```
PROHIBITED: "Task seems done, marking complete"
CORRECT: "Task appears complete. Would you like to mark it done?"

PROHIBITED: "Budget is $50,000 based on my calculation"
CORRECT: "Budget is $50,000 according to project data"

PROHIBITED: Changing user permissions
CORRECT: Suggesting permission changes for admin review
```

---

## 3. Trust Principles

### Data Source Trust Hierarchy

```
Level 1 (Highest): Database values
  ↓ Always use for: counts, percentages, dates, amounts

Level 2: RAG-retrieved documents
  ↓ Always cite source, indicate retrieval date

Level 3: LLM-generated content
  ↓ Always mark as "AI-generated", require review
```

### Response Validation Rules

| Data Type | Validation | Action |
|-----------|------------|--------|
| Counts | Must match DB | Query verification |
| Dates | Must match DB | No approximation |
| Names | Must match DB | Exact match only |
| Summaries | Review required | Human approval |
| Suggestions | Non-binding | User decision |

---

## 4. Failure Handling

### When AI Cannot Answer

| Scenario | Response |
|----------|----------|
| No relevant documents found | "No information found in project documents" |
| Query out of scope | "This question is outside the system's scope" |
| Ambiguous query | Ask clarifying question |
| Service unavailable | Graceful degradation message |

### Failure Codes (Taxonomy)

| Code | Category | User Message |
|------|----------|--------------|
| F001 | No context | "No relevant documents found" |
| F002 | Out of scope | "Outside system scope" |
| F003 | Ambiguous | "Please clarify your question" |
| F004 | Service error | "AI service temporarily unavailable" |

---

## 5. Implementation Constraints

### Prompt-Level Constraints

```python
SYSTEM_PROMPT = """
You are a project management assistant.

STRICT RULES:
1. Never claim to modify data directly
2. All numerical values must come from provided context
3. Always cite sources for factual claims
4. Mark suggestions as "Recommendation:"
5. Ask for clarification when uncertain
"""
```

### Code-Level Constraints

| Constraint | Implementation |
|------------|----------------|
| No DB writes | LLM service has no PostgreSQL access |
| Read-only Neo4j | Only SELECT/MATCH operations |
| Response format | Structured JSON with metadata |
| Authority tagging | Every response includes authority level |

---

## 6. Monitoring & Audit

### Logged Information

| Field | Purpose |
|-------|---------|
| query | User input |
| intent | Classified intent |
| track | L1 or L2 |
| authority_level | SUGGEST/DECIDE/EXECUTE/COMMIT |
| evidence_count | Number of RAG sources |
| response_time_ms | Performance tracking |
| failure_code | If applicable |

### Alert Conditions

| Condition | Alert |
|-----------|-------|
| Authority level > SUGGEST for data change | Warning |
| No evidence for factual claim | Warning |
| Response time > 30s | Performance alert |

---

*Last Updated: 2026-01-31*
