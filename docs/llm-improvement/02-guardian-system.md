# Phase 2: Guardian System Enhancement

## Objective

Implement the Guardian verification system that serves as the quality gate for all responses. Guardian is the **highest impact component** - get this right and response quality stabilizes immediately.

## Core Principle

> Guardian judges PASS/RETRY/FAIL - it does NOT write answers, suggest features, or expand scope.

## Implementation Checklist

- [ ] Create `guards/evidence_check.py` for evidence validation
- [ ] Create `guards/contract_check.py` for response contract validation
- [ ] Create `guards/policy_check.py` for policy/permission validation
- [ ] Create `nodes/guardian_verify.py` combining all checks
- [ ] Implement RETRY loop with max retry limit
- [ ] Create `nodes/retry_bump.py` for retry counter
- [ ] Write comprehensive tests for Guardian logic

---

## 1. Guardian Judgment Axes

### 1.1 Policy/Access Violation
- Permission level violation
- Forbidden topics/expressions
- Sensitive data exposure potential

### 1.2 Evidence Sufficiency
- Count/diversity/confidence
- Source matching for request type
- STATUS query using only `doc` → FAIL/RETRY

### 1.3 Consistency/Contract
- `domain_terms` usage
- `required_sections` completeness
- Response format compliance

---

## 2. Evidence Check Implementation

```python
# guards/evidence_check.py
from typing import List, Tuple
from contracts.state import EvidenceItem, ChatState

def check_evidence(state: ChatState) -> Tuple[bool, str, List[str]]:
    """
    Returns (ok, reason, required_actions)
    """
    rt = state.get("request_type")
    track = state.get("track")
    evidence: List[EvidenceItem] = state.get("evidence", []) or []

    # QUALITY track requirements
    if track == "QUALITY":
        # Minimum 2 evidence items
        if len(evidence) < 2:
            return False, "insufficient_evidence_count(<2)", [
                "ADD_EVIDENCE", "RETRIEVE_MORE"
            ]

        # Source diversity check
        sources = {e["source"] for e in evidence}
        if len(sources) < 2:
            return False, "low_source_diversity(<2)", [
                "DIVERSIFY_SOURCES", "RETRIEVE_MORE"
            ]

    # Request type specific rules
    sources = {e["source"] for e in evidence}

    # STATUS types: DB required, doc forbidden
    if rt in ("STATUS_METRIC", "STATUS_SUMMARY", "STATUS_LIST"):
        if "doc" in sources:
            return False, "status_request_must_not_use_doc_as_primary", [
                "REMOVE_DOC_EVIDENCE", "USE_DB_ONLY"
            ]
        if "db" not in sources:
            return False, "status_request_requires_db", [
                "USE_DB_ONLY", "RETRIEVE_DB"
            ]

    # Design/Policy types: doc or policy required
    if rt in ("HOWTO_POLICY", "DATA_DEFINITION", "DESIGN_ARCH"):
        if ("doc" not in sources) and ("policy" not in sources):
            if track == "QUALITY":
                return False, "design_policy_requires_doc_or_policy", [
                    "RETRIEVE_DOC", "RETRIEVE_POLICY"
                ]

    # Confidence check (QUALITY track)
    if track == "QUALITY" and evidence:
        avg_conf = sum(e["confidence"] for e in evidence) / len(evidence)
        if avg_conf < 0.60:
            return False, f"low_evidence_confidence(avg={avg_conf:.2f})", [
                "RETRIEVE_MORE", "REFINE_QUERY"
            ]

    return True, "ok", []
```

---

## 3. Evidence Rules by Request Type

| RequestType | Required Source | Forbidden Source | Recommended |
|-------------|----------------|------------------|-------------|
| STATUS_METRIC | db | doc | policy (definitions), neo4j (auxiliary) |
| STATUS_SUMMARY | db | doc | policy |
| STATUS_LIST | db | doc | neo4j (relationships) |
| HOWTO_POLICY | policy OR doc | - | db (config values) |
| DESIGN_ARCH | doc OR policy | - | db/neo4j (current state) |
| DATA_DEFINITION | policy OR doc | - | db (verification) |
| TROUBLESHOOTING | db, neo4j | - | policy (security filter) |
| KNOWLEDGE_QA | doc OR neo4j | - | policy (constraints) |
| CASUAL | (none) | - | (none) |

### Track-specific Minimum Evidence

**QUALITY Track:**
- evidence >= 2
- source diversity >= 2 (recommended)
- average confidence >= 0.65 (recommended)

**FAST Track:**
- evidence >= 1 (if possible)
- No evidence → restrict scope, forbid definitive claims

---

## 4. Contract Check Implementation

```python
# guards/contract_check.py
from typing import Tuple, List
from contracts.state import ChatState
import re

def check_contract(state: ChatState) -> Tuple[bool, str, List[str]]:
    """
    Validate draft against ArchitectSpec contract.
    Returns (ok, reason, required_actions)
    """
    spec = state.get("architect_spec") or {}
    draft = state.get("draft_answer") or ""

    required_sections = spec.get("required_sections", [])
    forbidden = spec.get("forbidden_content", [])
    domain_terms = spec.get("domain_terms", [])

    # Section check - look for headers
    missing = []
    for section in required_sections:
        if section and section not in draft:
            # Also check markdown header format
            header_pattern = rf"##?\s*{re.escape(section)}"
            if not re.search(header_pattern, draft, re.I):
                missing.append(section)

    if missing:
        return False, f"missing_required_sections={missing}", [
            "ADD_REQUIRED_SECTIONS", "REGENERATE_DRAFT"
        ]

    # Forbidden content check
    hits = [f for f in forbidden if f and (f.lower() in draft.lower())]
    if hits:
        return False, f"forbidden_content_detected={hits}", [
            "REMOVE_FORBIDDEN_CONTENT", "REGENERATE_DRAFT"
        ]

    # Domain terms usage (at least 1 required)
    if domain_terms:
        used = [t for t in domain_terms if t and (t in draft)]
        if len(used) == 0:
            return False, "domain_terms_not_used", [
                "USE_DOMAIN_TERMS", "REGENERATE_DRAFT"
            ]

    return True, "ok", []
```

---

## 5. Guardian Verify Node

```python
# nodes/guardian_verify.py
from contracts.state import ChatState
from guards.evidence_check import check_evidence
from guards.contract_check import check_contract

MAX_RETRY = 2

def guardian_verify(state: ChatState) -> ChatState:
    """
    Main Guardian verification node.
    Combines evidence, contract, and policy checks.
    """
    retry_count = state.get("retry_count", 0)
    reasons = []
    actions = []

    # 1) Evidence check
    ok, reason, req_actions = check_evidence(state)
    if not ok:
        reasons.append(reason)
        actions.extend(req_actions)

        if state.get("track") == "QUALITY" and retry_count < MAX_RETRY:
            state["guardian"] = {
                "verdict": "RETRY",
                "reasons": reasons,
                "required_actions": list(dict.fromkeys(actions)),
                "risk_level": "med"
            }
            return state

        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": reasons,
            "required_actions": ["ASK_MINIMAL_QUESTION"],
            "risk_level": "med"
        }
        return state

    # 2) Contract check (QUALITY only - stricter)
    if state.get("track") == "QUALITY":
        ok, reason, req_actions = check_contract(state)
        if not ok:
            reasons.append(reason)
            actions.extend(req_actions)

            if retry_count < MAX_RETRY:
                state["guardian"] = {
                    "verdict": "RETRY",
                    "reasons": reasons,
                    "required_actions": list(dict.fromkeys(actions)),
                    "risk_level": "low"
                }
                return state

            state["guardian"] = {
                "verdict": "FAIL",
                "reasons": reasons,
                "required_actions": ["SAFE_REFUSAL"],
                "risk_level": "low"
            }
            return state

    # 3) All checks passed
    state["guardian"] = {
        "verdict": "PASS",
        "reasons": [],
        "required_actions": [],
        "risk_level": "low"
    }
    return state
```

---

## 6. Retry Counter

```python
# nodes/retry_bump.py
from contracts.state import ChatState

def bump_retry(state: ChatState) -> ChatState:
    """Increment retry counter for RETRY loop."""
    state["retry_count"] = state.get("retry_count", 0) + 1
    return state
```

---

## 7. Guardian Verdict Flow

```
Guardian Verify
      │
      ├── PASS ──────────→ Finalize
      │
      ├── RETRY (retry_count < MAX)
      │         │
      │         └──→ bump_retry ──→ retrieve_quality
      │                              (uses required_actions)
      │
      └── FAIL ──────────→ safe_exit
                           (refusal or minimal question)
```

### RETRY Loop Design

- Maximum N retries (recommended: 2-3)
- Guardian specifies `required_actions` for what to change:
  - "Add 1 more DB evidence"
  - "Add policy source"
  - "Fix domain term X to Y"
  - "Add missing contract section"
- Retrieve/Generate nodes read `required_actions` and adapt behavior

---

## 8. Guardian Allowed/Forbidden Rules

### Guardian (Risk/Quality) Role

**Allowed:**
- PASS/FAIL/RETRY verdict
- reasons (list of strings)
- required_actions (enum values)
- risk_level

**Forbidden:**
- Suggesting new features/scope expansion
- Adding design/improvement ideas to judgment
- Writing answer content (verification only)

---

## 9. Verdict Decision Logic

```python
def _decide_verdict(
    evidence_ok: bool,
    contract_ok: bool,
    policy_ok: bool,
    retry_count: int,
    max_retry: int
) -> str:
    """
    Decision matrix for Guardian verdict.
    """
    # Policy violation is immediate FAIL (no retry)
    if not policy_ok:
        return "FAIL"

    # Evidence or contract issues can RETRY
    if not evidence_ok or not contract_ok:
        if retry_count < max_retry:
            return "RETRY"
        return "FAIL"

    return "PASS"
```

---

## 10. Testing Requirements

```python
# tests/test_guardian_verify.py

def test_guardian_retry_on_insufficient_evidence():
    state = {
        "track": "QUALITY",
        "retry_count": 0,
        "request_type": "DESIGN_ARCH",
        "evidence": [
            {"source": "doc", "ref": "c1", "snippet": "...", "confidence": 0.7}
        ],  # Only 1 evidence - insufficient for QUALITY
        "architect_spec": {
            "response_format": "markdown",
            "domain_terms": [],
            "forbidden_content": [],
            "required_sections": ["Summary"]
        },
        "draft_answer": "## Summary\nContent here"
    }
    out = guardian_verify(state)
    assert out["guardian"]["verdict"] == "RETRY"
    assert "RETRIEVE_MORE" in out["guardian"]["required_actions"]

def test_guardian_fail_after_max_retry():
    state = {
        "track": "QUALITY",
        "retry_count": 2,  # MAX reached
        "request_type": "DESIGN_ARCH",
        "evidence": [
            {"source": "doc", "ref": "c1", "snippet": "...", "confidence": 0.7}
        ],
        "architect_spec": {...},
        "draft_answer": "..."
    }
    out = guardian_verify(state)
    assert out["guardian"]["verdict"] == "FAIL"

def test_status_metric_requires_db_evidence():
    state = {
        "track": "QUALITY",
        "retry_count": 0,
        "request_type": "STATUS_METRIC",
        "evidence": [
            {"source": "doc", "ref": "c1", "snippet": "...", "confidence": 0.8},
            {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.9},
        ],  # No DB evidence for STATUS_METRIC
        ...
    }
    out = guardian_verify(state)
    assert out["guardian"]["verdict"] in ["RETRY", "FAIL"]
    assert "USE_DB_ONLY" in out["guardian"]["required_actions"] or \
           "RETRIEVE_DB" in out["guardian"]["required_actions"]
```

---

## 11. Integration with L0 Policy Engine

For production, add policy check as first step:

```python
def guardian_verify(state: ChatState) -> ChatState:
    # 0) Policy check (FIRST - no retry allowed)
    policy_result = policy_engine.check(
        state["user_query"],
        user_context,
        state["request_type"]
    )

    if policy_result.decision == "DENY":
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": policy_result.reasons,
            "required_actions": [],
            "risk_level": "high"
        }
        return state

    # Continue with evidence/contract checks...
```

---

## Completion Criteria

- [ ] Evidence check validates request type rules
- [ ] Contract check validates against ArchitectSpec
- [ ] Guardian returns proper verdict with reasons/actions
- [ ] RETRY loop respects max retry limit
- [ ] required_actions uses only enum values
- [ ] Tests cover PASS/RETRY/FAIL scenarios
- [ ] STATUS types block doc evidence

## Next Phase

Proceed to [Phase 3: Analyst Plan](./03-analyst-plan.md) after Guardian system is working.
