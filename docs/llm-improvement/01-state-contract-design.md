# Phase 1: State/Contract Foundation

## Objective

Establish typed state structures and contracts that enable programmatic BMAD enforcement. Without this foundation, role mixing cannot be eliminated.

## Core Principles

1. **Stage outputs exist only as Typed structures**
2. **Free text allowed only in `draft_answer`, `final_answer`**
3. **All other fields must be structured for validation**

## Implementation Checklist

- [ ] Create `contracts/state.py` with TypedDict definitions
- [ ] Create `contracts/schemas.py` with JSON schemas for validation
- [ ] Create `contracts/request_types.py` with RequestType enum
- [ ] Create `contracts/track_policy.py` for track selection logic
- [ ] Create `contracts/actions.py` for Guardian action enum
- [ ] Create `guards/output_guard.py` for schema validation
- [ ] Create `guards/json_parse.py` for LLM output parsing
- [ ] Write unit tests for all guards

---

## 1. Request Types Definition

```python
# contracts/request_types.py
from typing import Literal

RequestType = Literal[
    "STATUS_METRIC",      # Numbers/metrics: completion rate, WIP, story count, trends
    "STATUS_SUMMARY",     # Weekly report/summary: narrative progress (db-based evidence)
    "STATUS_LIST",        # Lists: in-progress stories/risk lists/blocker lists
    "HOWTO_POLICY",       # Usage/operational policy/guides (doc/policy priority)
    "DESIGN_ARCH",        # Design/architecture/structured document generation
    "DATA_DEFINITION",    # Metric definition/term definition/data meaning
    "TROUBLESHOOTING",    # Failure/error/log-based root cause analysis
    "KNOWLEDGE_QA",       # General knowledge Q&A (doc + neo4j)
    "CASUAL"              # Chit-chat/opinion/brainstorming
]
```

### Request Type Purpose

| Type | Evidence Priority | Forbidden | Use Case |
|------|------------------|-----------|----------|
| STATUS_METRIC | db (required) | doc | Numeric queries, KPIs, burndown |
| STATUS_SUMMARY | db (required) | doc | Weekly reports, progress summaries |
| STATUS_LIST | db (required) | doc | Task lists, blocker lists |
| HOWTO_POLICY | policy, doc | - | Guides, rules, permissions |
| DESIGN_ARCH | doc, policy | - | Architecture, contracts, schemas |
| DATA_DEFINITION | policy, doc | - | Term definitions, metric meanings |
| TROUBLESHOOTING | db, neo4j | - | Error analysis, log investigation |
| KNOWLEDGE_QA | doc, neo4j | - | General technical Q&A |
| CASUAL | (none) | - | Casual conversation |

---

## 2. State Definition

```python
# contracts/state.py
from typing import TypedDict, Literal, List, Dict, Optional

Track = Literal["FAST", "QUALITY"]
Verdict = Literal["PASS", "FAIL", "RETRY"]
EvidenceSource = Literal["db", "neo4j", "doc", "policy"]

class EvidenceItem(TypedDict):
    source: EvidenceSource
    ref: str
    snippet: str
    confidence: float

class AnalystPlan(TypedDict):
    intent: str
    request_type: str  # RequestType
    track: Track
    required_sources: List[EvidenceSource]
    missing_info_questions: List[str]  # 0-1 recommended (FAST: 0)
    expected_output_schema: str  # e.g. "answer_v1_markdown", "status_v1_json"

class ArchitectSpec(TypedDict):
    response_format: Literal["markdown", "json", "hybrid"]
    domain_terms: List[str]        # Terms that MUST be used
    forbidden_content: List[str]   # Forbidden topics/expressions/speculation
    required_sections: List[str]   # Sections that MUST be included

class GuardianReport(TypedDict):
    verdict: Verdict
    reasons: List[str]
    required_actions: List[str]    # Actions to perform on RETRY
    risk_level: Literal["low", "med", "high"]

class ChatState(TypedDict, total=False):
    # Input
    user_query: str

    # Routing
    track: Track
    request_type: str  # RequestType
    route_reason: str

    # BMAD Stage Outputs
    analyst_plan: AnalystPlan
    evidence: List[EvidenceItem]
    architect_spec: ArchitectSpec
    draft_answer: str
    guardian: GuardianReport
    final_answer: str

    # Loop/Operations
    retry_count: int
    trace_id: str
    timings_ms: Dict[str, int]
```

---

## 3. JSON Schemas for Validation

```python
# contracts/schemas.py

ANALYST_PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "intent", "request_type", "track",
        "required_sources", "missing_info_questions", "expected_output_schema"
    ],
    "properties": {
        "intent": {"type": "string", "minLength": 1},
        "request_type": {"type": "string"},
        "track": {"type": "string", "enum": ["FAST", "QUALITY"]},
        "required_sources": {
            "type": "array",
            "items": {"type": "string", "enum": ["db", "neo4j", "doc", "policy"]},
            "minItems": 0
        },
        "missing_info_questions": {
            "type": "array",
            "items": {"type": "string"},
            "maxItems": 1  # CRITICAL: Max 1 question
        },
        "expected_output_schema": {"type": "string", "minLength": 1}
    }
}

ARCHITECT_SPEC_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "response_format", "domain_terms",
        "forbidden_content", "required_sections"
    ],
    "properties": {
        "response_format": {
            "type": "string",
            "enum": ["markdown", "json", "hybrid"]
        },
        "domain_terms": {
            "type": "array",
            "items": {"type": "string"}
        },
        "forbidden_content": {
            "type": "array",
            "items": {"type": "string"}
        },
        "required_sections": {
            "type": "array",
            "items": {"type": "string"}
        }
    }
}

GUARDIAN_REPORT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["verdict", "reasons", "required_actions", "risk_level"],
    "properties": {
        "verdict": {"type": "string", "enum": ["PASS", "FAIL", "RETRY"]},
        "reasons": {"type": "array", "items": {"type": "string"}},
        "required_actions": {"type": "array", "items": {"type": "string"}},
        "risk_level": {"type": "string", "enum": ["low", "med", "high"]}
    }
}
```

---

## 4. Guardian Action Enum (Standard Actions)

```python
# contracts/actions.py
from typing import Literal

GuardianAction = Literal[
    # Evidence-related
    "ADD_EVIDENCE",
    "RETRIEVE_MORE",
    "DIVERSIFY_SOURCES",
    "RETRIEVE_DB",
    "RETRIEVE_NEO4J",
    "RETRIEVE_DOC",
    "RETRIEVE_POLICY",
    "REMOVE_DOC_EVIDENCE",
    "USE_DB_ONLY",
    "REFINE_QUERY",

    # Contract-related
    "ADD_REQUIRED_SECTIONS",
    "REGENERATE_DRAFT",
    "REMOVE_FORBIDDEN_CONTENT",
    "USE_DOMAIN_TERMS",

    # Safety/Flow
    "ASK_MINIMAL_QUESTION",
    "SAFE_REFUSAL"
]
```

### Why Standard Actions Matter

- RETRY actions MUST be deterministic enum values
- Free-form text instructions cause execution instability
- Retrieve/Generate nodes can automatically adapt behavior based on enum

---

## 5. Track Policy

```python
# contracts/track_policy.py
from typing import Tuple
import re

# Default track by request type
_DEFAULT_TRACK_BY_TYPE = {
    "STATUS_METRIC": "QUALITY",    # Numbers need evidence enforcement
    "STATUS_SUMMARY": "QUALITY",   # Weekly reports need evidence basis
    "STATUS_LIST": "QUALITY",      # Lists need DB-based filtering
    "HOWTO_POLICY": "QUALITY",     # Policy/permissions need accuracy
    "DESIGN_ARCH": "QUALITY",      # Design requires contract/validation loop
    "DATA_DEFINITION": "QUALITY",  # Definitions need doc/policy verification
    "TROUBLESHOOTING": "QUALITY",  # Error analysis needs safety/accuracy
    "KNOWLEDGE_QA": "FAST",        # Simple Q&A can start FAST
    "CASUAL": "FAST",              # Casual chat is FAST
}

# Force QUALITY for high-risk keywords
_FORCE_QUALITY_HINT = re.compile(
    r"(설계서|architecture|policy|권한|permission|지표|metric|kpi|db|neo4j|langgraph)",
    re.I
)

def choose_track_for_request_type(rt: str, query: str) -> Tuple[str, str]:
    """Returns (track, reason). Track is policy-driven."""
    base = _DEFAULT_TRACK_BY_TYPE.get(rt, "FAST")

    # Force QUALITY if high-risk hints present
    if base == "FAST" and _FORCE_QUALITY_HINT.search(query):
        return "QUALITY", f"track_policy:force_quality_by_hint(rt={rt})"

    return base, f"track_policy:default(rt={rt})"
```

---

## 6. Output Guard Implementation

```python
# guards/output_guard.py
from typing import Dict, Any, Tuple, List
from jsonschema import validate, ValidationError
from contracts.schemas import (
    ANALYST_PLAN_SCHEMA,
    ARCHITECT_SPEC_SCHEMA,
    GUARDIAN_REPORT_SCHEMA
)

ROLE_SCHEMAS = {
    "ANALYST": ANALYST_PLAN_SCHEMA,
    "ARCHITECT": ARCHITECT_SPEC_SCHEMA,
    "GUARDIAN": GUARDIAN_REPORT_SCHEMA,
}

def validate_role_output(role: str, output: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate output against role schema.
    Returns (ok, errors).
    """
    errors: List[str] = []
    schema = ROLE_SCHEMAS.get(role)

    if not schema:
        return False, [f"unknown_role={role}"]

    try:
        validate(instance=output, schema=schema)
    except ValidationError as e:
        return False, [f"schema_violation: {e.message}"]

    # Role-specific constraints
    if role == "ANALYST":
        # Questions must be max 1
        if len(output.get("missing_info_questions", [])) > 1:
            errors.append("missing_info_questions must be <= 1")

    if role == "GUARDIAN":
        # PASS should not have required_actions
        if output.get("verdict") == "PASS" and output.get("required_actions"):
            errors.append("PASS should not contain required_actions")

    return (len(errors) == 0), errors
```

---

## 7. JSON Parser for LLM Output

```python
# guards/json_parse.py
import json
import re
from typing import Any, Dict

_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)

def extract_first_json(text: str) -> Dict[str, Any]:
    """
    Extract first JSON object from LLM output.
    - Handles code fences
    - Handles surrounding natural language
    - Fixes common JSON formatting issues
    """
    m = _JSON_BLOCK_RE.search(text)
    if not m:
        raise ValueError("no_json_object_found")

    raw = m.group(0).strip()

    # Fix common issues
    raw = re.sub(r",\s*}", "}", raw)  # Trailing commas
    raw = re.sub(r",\s*]", "]", raw)

    return json.loads(raw)
```

---

## 8. Contract Design Principles

### Entry Tickets

| Contract | Entry Ticket For |
|----------|------------------|
| AnalystPlan | Retrieve |
| ArchitectSpec | Generate |
| GuardianReport(PASS) | Finalize |

### Domain Rules as Policy

- Status queries: `doc` source forbidden, DB required
- Design queries: `doc` or `policy` required
- Evidence source must match request type

---

## Testing Requirements

### Unit Tests

```python
# tests/test_output_guard.py

def test_analyst_plan_valid():
    obj = {
        "intent": "design doc generation",
        "request_type": "DESIGN_ARCH",
        "track": "QUALITY",
        "required_sources": ["doc", "policy"],
        "missing_info_questions": [],
        "expected_output_schema": "answer_v1_markdown",
    }
    ok, errs = validate_role_output("ANALYST", obj)
    assert ok
    assert errs == []

def test_analyst_plan_too_many_questions():
    obj = {
        "intent": "x",
        "request_type": "KNOWLEDGE_QA",
        "track": "FAST",
        "required_sources": [],
        "missing_info_questions": ["q1", "q2"],  # TOO MANY
        "expected_output_schema": "answer_v1_markdown",
    }
    ok, errs = validate_role_output("ANALYST", obj)
    assert not ok
    assert any("missing_info_questions" in e for e in errs)

def test_guardian_pass_with_actions_invalid():
    obj = {
        "verdict": "PASS",
        "reasons": [],
        "required_actions": ["RETRIEVE_DB"],  # INVALID for PASS
        "risk_level": "low"
    }
    ok, errs = validate_role_output("GUARDIAN", obj)
    assert not ok
```

---

## Completion Criteria

- [ ] All TypedDict definitions created
- [ ] All JSON schemas defined
- [ ] RequestType enum covers all use cases
- [ ] Track policy table implemented
- [ ] Guardian action enum is complete
- [ ] Output guard validates all roles
- [ ] JSON parser handles edge cases
- [ ] Unit tests pass for all guards

## Next Phase

Proceed to [Phase 2: Guardian System](./02-guardian-system.md) after completing state/contract foundation.
