# Phase 3: Analyst Plan Introduction

## Objective

Implement the Analyst stage that plans intent, scope, and required sources BEFORE any retrieval happens. This eliminates "searching without a plan".

## Core Principle

> **AnalystPlan is the entry ticket for Retrieve**
>
> No retrieval should happen without a validated AnalystPlan.

## Implementation Checklist

- [ ] Create `nodes/analyst_plan.py` with prompt template
- [ ] Implement JSON parsing and output_guard validation
- [ ] Connect AnalystPlan to Router's request_type
- [ ] Ensure required_sources drives Retrieve behavior
- [ ] Handle parse failures gracefully
- [ ] Write tests for Analyst output validation

---

## 1. Analyst Role Definition

### Allowed
- `intent` (intent label)
- `required_sources` (which sources to query)
- `missing_info_questions` (minimal, 0-1 only)
- `expected_output_schema`

### Forbidden
- Implementation code, library decisions, stack changes
- DB schema change specifics (DDL level)
- Creating policy exceptions arbitrarily

---

## 2. Analyst Plan Node Implementation

```python
# nodes/analyst_plan.py
from typing import Any, Dict
from contracts.state import ChatState
from guards.json_parse import extract_first_json
from guards.output_guard import validate_role_output

ANALYST_PROMPT = """You are BMAD Analyst.
Return ONLY a JSON object that matches this schema (no extra text):

{
    "intent": "string",
    "request_type": "STATUS_METRIC|STATUS_SUMMARY|STATUS_LIST|HOWTO_POLICY|DESIGN_ARCH|DATA_DEFINITION|TROUBLESHOOTING|KNOWLEDGE_QA|CASUAL",
    "track": "FAST|QUALITY",
    "required_sources": ["db|neo4j|doc|policy", ...],
    "missing_info_questions": ["string (max 1)"],
    "expected_output_schema": "string"
}

Rules:
- If request_type is STATUS_METRIC/STATUS_SUMMARY/STATUS_LIST, required_sources MUST include "db" and MUST NOT include "doc".
- Keep missing_info_questions empty unless absolutely required. At most one question.
- expected_output_schema must be a stable identifier like "answer_v1_markdown" or "status_v1_json".

User query: {user_query}
"""

def analyst_plan(state: ChatState, llm) -> ChatState:
    """
    Generate AnalystPlan from user query.
    Validates output against schema.
    """
    prompt = ANALYST_PROMPT.format(user_query=state["user_query"])
    text = llm.invoke(prompt)

    try:
        obj = extract_first_json(text)
    except ValueError as e:
        # Parse failure - use safe defaults
        return _fallback_plan(state, str(e))

    ok, errs = validate_role_output("ANALYST", obj)
    if not ok:
        return _fallback_plan(state, f"validation_failed:{errs}")

    # Store validated plan
    state["analyst_plan"] = obj

    # Sync with router values (analyst can refine)
    state["request_type"] = obj.get("request_type", state.get("request_type"))
    state["track"] = obj.get("track", state.get("track"))

    return state

def _fallback_plan(state: ChatState, reason: str) -> ChatState:
    """
    Fallback to safe QUALITY plan when parsing fails.
    """
    state["analyst_plan"] = {
        "intent": "parse_error",
        "request_type": state.get("request_type", "KNOWLEDGE_QA"),
        "track": "QUALITY",
        "required_sources": ["policy"],
        "missing_info_questions": [],
        "expected_output_schema": "answer_v1_markdown"
    }
    state["route_reason"] = f"analyst_plan_fallback:{reason}"
    return state
```

---

## 3. Request Type → Required Sources Mapping

```python
# Recommended sources by request type
REQUIRED_SOURCES_BY_TYPE = {
    "STATUS_METRIC": ["db"],           # DB only, doc forbidden
    "STATUS_SUMMARY": ["db"],          # DB only, doc forbidden
    "STATUS_LIST": ["db"],             # DB only, doc forbidden
    "HOWTO_POLICY": ["policy", "doc"], # Policy/doc priority
    "DESIGN_ARCH": ["doc", "policy"],  # Doc/policy for architecture
    "DATA_DEFINITION": ["policy", "doc"],
    "TROUBLESHOOTING": ["db", "neo4j"],
    "KNOWLEDGE_QA": ["doc", "neo4j"],
    "CASUAL": [],                      # No evidence needed
}

FORBIDDEN_SOURCES_BY_TYPE = {
    "STATUS_METRIC": ["doc"],
    "STATUS_SUMMARY": ["doc"],
    "STATUS_LIST": ["doc"],
}
```

---

## 4. Prompt Design Principles

### Key Instructions

1. **Output format**: JSON only, no surrounding text
2. **Request type rules**: Enforce STATUS→DB, DESIGN→doc/policy
3. **Question limit**: Max 1 question, prefer 0
4. **Schema identifier**: Stable naming for output format

### Example Outputs

**Good Analyst Output (STATUS_METRIC):**
```json
{
    "intent": "query_sprint_completion_rate",
    "request_type": "STATUS_METRIC",
    "track": "QUALITY",
    "required_sources": ["db"],
    "missing_info_questions": [],
    "expected_output_schema": "status_metric_v1_json"
}
```

**Good Analyst Output (DESIGN_ARCH):**
```json
{
    "intent": "create_langgraph_bmad_design_document",
    "request_type": "DESIGN_ARCH",
    "track": "QUALITY",
    "required_sources": ["doc", "policy"],
    "missing_info_questions": [],
    "expected_output_schema": "design_doc_v1_markdown"
}
```

---

## 5. Router vs Analyst Relationship

```
User Query
    │
    ▼
┌─────────┐
│ Router  │ ──→ Initial request_type, track (rule + model)
└────┬────┘
     │
     ▼
┌──────────────┐
│ Analyst Plan │ ──→ Refined intent, required_sources, track
└──────────────┘
     │
     ▼
  Retrieve (uses required_sources)
```

### Conflict Resolution Policy

| Scenario | Resolution |
|----------|------------|
| Router: FAST, Analyst: QUALITY | Analyst wins (promotes to QUALITY) |
| Router: DESIGN_ARCH, Analyst: CASUAL | Router wins (maintain high-stakes type) |
| Router: STATUS_METRIC, Analyst adds "doc" | output_guard FAIL (source forbidden) |

---

## 6. Integration with Retrieve

Retrieve node reads `analyst_plan.required_sources`:

```python
# In nodes/retrieve_evidence.py

def _get_sources_from_plan(state: ChatState) -> List[str]:
    plan = state.get("analyst_plan") or {}
    return plan.get("required_sources", [])

def retrieve_evidence(state: ChatState, retrievers: Dict) -> ChatState:
    sources = _get_sources_from_plan(state)

    for src in sources:
        if src in retrievers:
            hits = retrievers[src].search(state["user_query"])
            # Add to evidence...

    return state
```

---

## 7. Handling Missing Info Questions

When Analyst outputs questions:

```json
{
    "intent": "unclear_metric_request",
    "request_type": "STATUS_METRIC",
    "track": "QUALITY",
    "required_sources": ["db"],
    "missing_info_questions": ["Which sprint are you asking about?"],
    "expected_output_schema": "clarification_v1"
}
```

**Behavior:**
1. If `missing_info_questions` has items → route to clarification flow
2. Generate minimal question response
3. Wait for user input before proceeding

**Constraints:**
- FAST track: questions must be empty (0)
- QUALITY track: max 1 question
- Questions should be specific and actionable

---

## 8. Error Handling

### Parse Failure
```python
if not extract_first_json(text):
    # Fallback to safe QUALITY path
    # Use policy-only sources
    # Log for investigation
```

### Validation Failure
```python
if not validate_role_output("ANALYST", obj):
    # Log specific validation errors
    # Fallback to conservative plan
    # Flag for review
```

### Source Conflict
```python
if rt == "STATUS_METRIC" and "doc" in required_sources:
    # This should not happen if prompt is correct
    # Remove doc from sources
    # Log warning
    required_sources = [s for s in required_sources if s != "doc"]
```

---

## 9. Testing Requirements

```python
# tests/test_analyst_plan.py

def test_analyst_status_metric_no_doc():
    """STATUS_METRIC should not include doc in sources."""
    state = {"user_query": "What's the sprint completion rate?"}
    result = analyst_plan(state, mock_llm)

    plan = result["analyst_plan"]
    assert plan["request_type"] == "STATUS_METRIC"
    assert "db" in plan["required_sources"]
    assert "doc" not in plan["required_sources"]

def test_analyst_max_one_question():
    """Questions should be 0 or 1."""
    state = {"user_query": "Something unclear..."}
    result = analyst_plan(state, mock_llm)

    questions = result["analyst_plan"]["missing_info_questions"]
    assert len(questions) <= 1

def test_analyst_fallback_on_parse_error():
    """Parse failure should use safe defaults."""
    state = {"user_query": "test"}
    # Mock LLM returns invalid JSON
    mock_llm = MockLLM("This is not JSON")
    result = analyst_plan(state, mock_llm)

    assert result["analyst_plan"]["track"] == "QUALITY"
    assert "fallback" in result.get("route_reason", "")

def test_analyst_design_arch_requires_doc():
    """DESIGN_ARCH should include doc or policy."""
    state = {"user_query": "Design the new authentication module"}
    result = analyst_plan(state, mock_llm)

    plan = result["analyst_plan"]
    sources = plan["required_sources"]
    assert "doc" in sources or "policy" in sources
```

---

## 10. Observability

Track Analyst stage metrics:

```python
# Metrics to emit
analyst_plan_success_total
analyst_plan_fallback_total{reason}
analyst_questions_generated_total
analyst_source_selection{source, request_type}
```

---

## Completion Criteria

- [ ] Analyst prompt generates valid JSON
- [ ] output_guard validates all Analyst outputs
- [ ] required_sources respects request type rules
- [ ] Parse failures handled gracefully
- [ ] Questions limited to max 1
- [ ] Retrieve uses Analyst's required_sources
- [ ] Tests cover all request types

## Next Phase

Proceed to [Phase 4: Architect Spec](./04-architect-spec.md) after Analyst Plan is working.
