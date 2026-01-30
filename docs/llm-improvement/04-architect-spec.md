# Phase 4: Architect Spec Enhancement

## Objective

Implement the Architect stage that defines response structure, contracts, and constraints BEFORE generation. This eliminates "generating without structure".

## Core Principle

> **ArchitectSpec is the entry ticket for Generate**
>
> No generation should happen without a validated ArchitectSpec defining the contract.

---

## 1. Architect Role Definition

### Allowed
- Response format/sections/contract definition
- Data flow / API contract / failure modes / security gates
- Domain terminology rules and consistency requirements

### Forbidden
- Implementation detail code (production code level)
- Arbitrary stack change "directives"
- Making definitive claims/numbers without evidence

---

## 2. Implementation Checklist

- [ ] Create `nodes/architect_outline.py` with prompt template
- [ ] Implement JSON parsing and output_guard validation
- [ ] Define standard section templates by request type
- [ ] Connect ArchitectSpec to Generate node
- [ ] Handle parse failures gracefully
- [ ] Write tests for Architect output validation

---

## 3. Architect Outline Node Implementation

```python
# nodes/architect_outline.py
from contracts.state import ChatState
from guards.json_parse import extract_first_json
from guards.output_guard import validate_role_output

ARCHITECT_PROMPT = """You are BMAD Architect.
Return ONLY a JSON object that matches this schema:

{
    "response_format": "markdown|json|hybrid",
    "domain_terms": ["string", ...],
    "forbidden_content": ["string", ...],
    "required_sections": ["string", ...]
}

Rules:
- required_sections must be minimal but sufficient (3-8 sections).
- forbidden_content must include:
  - making up facts/numbers without evidence
  - disallowed sensitive content
  - any policy-prohibited items
- domain_terms must include key PMS terms relevant to the query.

User query: {user_query}
Request type: {request_type}
Track: {track}
"""

def architect_outline(state: ChatState, llm) -> ChatState:
    """
    Generate ArchitectSpec defining response contract.
    """
    prompt = ARCHITECT_PROMPT.format(
        user_query=state["user_query"],
        request_type=state.get("request_type", ""),
        track=state.get("track", "")
    )

    text = llm.invoke(prompt)

    try:
        obj = extract_first_json(text)
    except ValueError as e:
        return _fallback_spec(state, str(e))

    ok, errs = validate_role_output("ARCHITECT", obj)
    if not ok:
        return _fallback_spec(state, f"validation_failed:{errs}")

    state["architect_spec"] = obj
    return state

def _fallback_spec(state: ChatState) -> ChatState:
    """Safe fallback when Architect parsing fails."""
    state["architect_spec"] = {
        "response_format": "markdown",
        "domain_terms": ["Backlog", "Sprint", "UserStory"],
        "forbidden_content": [
            "inventing facts",
            "unauthorized access",
            "policy violation"
        ],
        "required_sections": ["Summary", "Evidence", "Answer"]
    }
    state["route_reason"] = f"{state.get('route_reason', '')}|architect_fallback"
    return state
```

---

## 4. Standard Section Templates by Request Type

```python
# contracts/section_templates.py

SECTION_TEMPLATES = {
    "STATUS_METRIC": {
        "response_format": "hybrid",
        "required_sections": [
            "Metric Overview",
            "Current Value",
            "Trend Analysis",
            "Data Source"
        ],
        "forbidden_content": [
            "estimated values without DB query",
            "document-based numbers",
            "speculation about future values"
        ]
    },

    "STATUS_SUMMARY": {
        "response_format": "markdown",
        "required_sections": [
            "Summary",
            "Completed Items",
            "In Progress",
            "Blockers/Risks",
            "Next Steps"
        ],
        "forbidden_content": [
            "numbers without DB verification",
            "assumed completion dates"
        ]
    },

    "DESIGN_ARCH": {
        "response_format": "markdown",
        "required_sections": [
            "Overview",
            "Architecture",
            "Components",
            "Data Flow",
            "Contracts/Interfaces",
            "Error Handling",
            "Considerations"
        ],
        "forbidden_content": [
            "implementation code",
            "unverified performance claims"
        ]
    },

    "HOWTO_POLICY": {
        "response_format": "markdown",
        "required_sections": [
            "Overview",
            "Prerequisites",
            "Steps",
            "Verification",
            "Related Policies"
        ],
        "forbidden_content": [
            "unauthorized workarounds",
            "policy exceptions without approval"
        ]
    },

    "KNOWLEDGE_QA": {
        "response_format": "markdown",
        "required_sections": [
            "Answer",
            "Evidence",
            "Related Information"
        ],
        "forbidden_content": [
            "definitive claims without sources",
            "speculation presented as fact"
        ]
    }
}
```

---

## 5. Domain Terms by Request Type

```python
# Domain-specific terms that MUST appear in responses

DOMAIN_TERMS = {
    "STATUS_METRIC": [
        "Sprint", "Velocity", "Burndown", "StoryPoint",
        "Completion Rate", "WIP", "Lead Time"
    ],

    "STATUS_SUMMARY": [
        "Sprint", "Backlog", "UserStory", "Task",
        "Blocker", "Risk", "Milestone"
    ],

    "DESIGN_ARCH": [
        "Component", "Interface", "Contract", "Module",
        "Dependency", "Flow", "State"
    ],

    "HOWTO_POLICY": [
        "Permission", "Role", "Access Level", "Policy",
        "Approval", "Workflow", "Compliance"
    ]
}
```

---

## 6. Enhanced Contract Check

```python
# guards/contract_check.py (enhanced)
import re
from typing import Tuple, List
from contracts.state import ChatState

def check_contract(state: ChatState) -> Tuple[bool, str, List[str]]:
    spec = state.get("architect_spec") or {}
    draft = state.get("draft_answer") or ""

    required_sections = spec.get("required_sections", [])
    forbidden = spec.get("forbidden_content", [])
    domain_terms = spec.get("domain_terms", [])
    response_format = spec.get("response_format", "markdown")

    # 1. Section header check (strict markdown format)
    missing = []
    for section in required_sections:
        if not section:
            continue

        # Check for markdown headers: ## Section or # Section
        patterns = [
            rf"^##?\s*{re.escape(section)}\s*$",  # Exact header
            rf"^##?\s*{re.escape(section)}:",     # Header with colon
            rf"\*\*{re.escape(section)}\*\*"      # Bold format
        ]

        found = any(re.search(p, draft, re.MULTILINE | re.I) for p in patterns)
        if not found:
            missing.append(section)

    if missing:
        return False, f"missing_required_sections={missing}", [
            "ADD_REQUIRED_SECTIONS", "REGENERATE_DRAFT"
        ]

    # 2. Forbidden content check (pattern matching)
    for pattern in forbidden:
        if not pattern:
            continue

        # Direct match
        if pattern.lower() in draft.lower():
            return False, f"forbidden_content_detected={pattern}", [
                "REMOVE_FORBIDDEN_CONTENT", "REGENERATE_DRAFT"
            ]

    # 3. Check for unfounded numeric claims (STATUS types)
    if state.get("request_type", "").startswith("STATUS"):
        # Pattern: number without evidence reference
        numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', draft)
        references = re.findall(r'\[\d+\]', draft)  # [1], [2] format

        if numbers and not references:
            return False, "numbers_without_evidence_reference", [
                "ADD_EVIDENCE_REFERENCES", "REGENERATE_DRAFT"
            ]

    # 4. Domain terms usage
    if domain_terms:
        used = [t for t in domain_terms if t and t.lower() in draft.lower()]
        if len(used) == 0:
            return False, "domain_terms_not_used", [
                "USE_DOMAIN_TERMS", "REGENERATE_DRAFT"
            ]

    # 5. Format compliance
    if response_format == "json":
        try:
            import json
            json.loads(draft)
        except json.JSONDecodeError:
            return False, "invalid_json_format", [
                "FIX_JSON_FORMAT", "REGENERATE_DRAFT"
            ]

    return True, "ok", []
```

---

## 7. Generate Draft with ArchitectSpec

```python
# nodes/generate_draft.py
from contracts.state import ChatState

def _format_evidence(state: ChatState) -> str:
    """Format evidence for prompt injection."""
    evidence = state.get("evidence", []) or []
    lines = []
    for i, e in enumerate(evidence, 1):
        lines.append(
            f"[{i}] source={e['source']} ref={e['ref']} "
            f"conf={e['confidence']}\n{e['snippet']}"
        )
    return "\n\n".join(lines) if lines else "(no evidence)"

DRAFT_PROMPT = """You are the Answer Generator.
You MUST follow ArchitectSpec strictly.
You MUST ground statements in Evidence.
If evidence is missing/weak, qualify and avoid definitive claims.

ArchitectSpec:
- response_format: {response_format}
- required_sections: {required_sections}
- domain_terms: {domain_terms}
- forbidden_content: {forbidden_content}

Evidence (use inline references like [1], [2] when stating facts):
{evidence_block}

User query: {user_query}

Now write the draft answer in {response_format} format.
Include all required_sections as headers.
Use domain_terms appropriately.
NEVER include forbidden_content.
"""

def generate_draft(state: ChatState, llm) -> ChatState:
    """Generate draft following ArchitectSpec contract."""
    spec = state.get("architect_spec") or {}

    prompt = DRAFT_PROMPT.format(
        response_format=spec.get("response_format", "markdown"),
        required_sections=spec.get("required_sections", []),
        domain_terms=spec.get("domain_terms", []),
        forbidden_content=spec.get("forbidden_content", []),
        evidence_block=_format_evidence(state),
        user_query=state["user_query"],
    )

    draft = llm.invoke(prompt)
    state["draft_answer"] = draft
    return state
```

---

## 8. Example ArchitectSpec Outputs

### STATUS_METRIC Request

```json
{
    "response_format": "hybrid",
    "domain_terms": ["Sprint", "Velocity", "Completion Rate", "StoryPoint"],
    "forbidden_content": [
        "estimated values",
        "document-based statistics",
        "future predictions"
    ],
    "required_sections": [
        "Metric Overview",
        "Current Value",
        "Trend (if available)",
        "Data Source Reference"
    ]
}
```

### DESIGN_ARCH Request

```json
{
    "response_format": "markdown",
    "domain_terms": ["LangGraph", "BMAD", "Guardian", "State", "Contract"],
    "forbidden_content": [
        "implementation code",
        "unverified performance claims",
        "arbitrary stack choices"
    ],
    "required_sections": [
        "Overview",
        "Architecture Diagram",
        "Component Responsibilities",
        "Data Flow",
        "Contracts/Interfaces",
        "Error Handling Strategy",
        "Trade-offs and Considerations"
    ]
}
```

---

## 9. Testing Requirements

```python
# tests/test_architect_outline.py

def test_architect_includes_forbidden_content():
    """Architect must define forbidden content."""
    state = {
        "user_query": "Design the auth module",
        "request_type": "DESIGN_ARCH",
        "track": "QUALITY"
    }
    result = architect_outline(state, mock_llm)

    spec = result["architect_spec"]
    assert len(spec["forbidden_content"]) > 0

def test_architect_status_forbids_speculation():
    """STATUS requests must forbid speculation."""
    state = {
        "user_query": "What's the sprint velocity?",
        "request_type": "STATUS_METRIC",
        "track": "QUALITY"
    }
    result = architect_outline(state, mock_llm)

    forbidden = result["architect_spec"]["forbidden_content"]
    # Should include something about unverified numbers
    assert any("estimated" in f.lower() or "speculation" in f.lower()
               for f in forbidden)

def test_contract_check_missing_sections():
    """Contract check should catch missing sections."""
    state = {
        "architect_spec": {
            "required_sections": ["Summary", "Evidence", "Conclusion"],
            "forbidden_content": [],
            "domain_terms": [],
            "response_format": "markdown"
        },
        "draft_answer": "## Summary\nSome content here.",
        "request_type": "KNOWLEDGE_QA"
    }

    ok, reason, actions = check_contract(state)
    assert not ok
    assert "missing_required_sections" in reason
    assert "Evidence" in reason or "Conclusion" in reason
```

---

## 10. ArchitectSpec → Guardian Flow

```
ArchitectSpec created
        │
        ▼
   Generate Draft
        │
        ▼
 ┌─────────────────┐
 │ Guardian Verify │
 │                 │
 │ - Evidence OK?  │
 │ - Contract OK?  │◀── Uses ArchitectSpec
 │ - Policy OK?    │    to validate draft
 └────────┬────────┘
          │
    PASS/RETRY/FAIL
```

---

## Completion Criteria

- [ ] Architect prompt generates valid JSON spec
- [ ] output_guard validates all Architect outputs
- [ ] Section templates defined for all request types
- [ ] Domain terms defined by request type
- [ ] Generate draft uses ArchitectSpec
- [ ] Contract check validates against spec
- [ ] Parse failures handled gracefully
- [ ] Tests cover all validation scenarios

## Next Phase

Proceed to [Phase 5: FAST Track Light Guardian](./05-fast-track-guardian.md) after Architect Spec is working.
