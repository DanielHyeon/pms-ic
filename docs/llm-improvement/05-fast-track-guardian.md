# Phase 5: FAST Track Light Guardian

## Objective

Implement lightweight BMAD for the FAST track that maintains safety without the full validation overhead. The goal is quick responses with minimal policy/evidence checks.

## Core Principle

> **FAST track: "Don't think deeply, answer quickly within safe bounds"**

---

## 1. FAST vs QUALITY Comparison

| Aspect | FAST Track | QUALITY Track |
|--------|------------|---------------|
| Target | Simple Q&A, casual chat | Complex analysis, design, metrics |
| BMAD Depth | Light (minimal nodes) | Full (all nodes) |
| Evidence | 1 if possible, none OK | Minimum 2, diversity required |
| Guardian | Rule-based only | Rule + model hybrid |
| Retry | No retry, upgrade or safe exit | Max 2-3 retries |
| p95 Target | Current baseline | +5% max allowed |

---

## 2. FAST Track Graph

```
[Router]
    │
    ▼
[Light Policy Gate] ──→ FAIL? ──→ Safe Exit
    │
    │ PASS
    ▼
[Retrieve (optional/minimal)]
    │
    ▼
[Generate (direct)]
    │
    ▼
[Light Guardian] ──→ FAIL? ──→ Upgrade to QUALITY or Safe Exit
    │
    │ PASS
    ▼
   END
```

---

## 3. Implementation Checklist

- [ ] Create `nodes/light_policy_gate.py`
- [ ] Create `nodes/light_guardian.py`
- [ ] Implement FAST → QUALITY upgrade path
- [ ] Implement safe exit for FAST failures
- [ ] Add sampling for Light Guardian (start with 10%)
- [ ] Write tests for FAST path scenarios

---

## 4. Light Policy Gate

First line of defense - blocks obviously unsafe requests before any processing.

```python
# nodes/light_policy_gate.py
from contracts.state import ChatState

# Banned keywords for immediate rejection
BANNED_KEYWORDS = [
    "api key", "password", "token", "secret",
    "credential", "private key", "auth token"
]

# Sensitive topics requiring QUALITY track
SENSITIVE_TOPICS = [
    "permission", "access level", "security",
    "delete", "remove all", "drop table"
]

def light_policy_gate(state: ChatState) -> ChatState:
    """
    Minimal policy check for FAST track.
    Blocks obviously unsafe requests.
    """
    query = state.get("user_query", "").lower()

    # Check for banned keywords
    for keyword in BANNED_KEYWORDS:
        if keyword in query:
            state["guardian"] = {
                "verdict": "FAIL",
                "reasons": [f"policy:banned_keyword({keyword})"],
                "required_actions": [],
                "risk_level": "high",
            }
            state["final_answer"] = (
                "Your request may contain sensitive information. "
                "Please remove sensitive data and try again."
            )
            return state

    # Check for sensitive topics (upgrade to QUALITY)
    for topic in SENSITIVE_TOPICS:
        if topic in query:
            state["guardian"] = {
                "verdict": "FAIL",
                "reasons": [f"policy:sensitive_topic({topic})"],
                "required_actions": [],
                "risk_level": "med",
            }
            # Mark for QUALITY upgrade instead of exit
            state["_upgrade_to_quality"] = True
            return state

    # Pass - continue FAST path
    return state
```

---

## 5. Light Guardian

Minimal rule-based validation for FAST track responses.

```python
# nodes/light_guardian.py
from contracts.state import ChatState
import re

def light_guardian(state: ChatState) -> ChatState:
    """
    Rule-based validation for FAST track.
    No model-based checks - only deterministic rules.
    """
    draft = state.get("draft_answer", "") or ""
    evidence = state.get("evidence", []) or []

    # Rule 1: Numbers without evidence
    has_numbers = bool(re.search(r'\b\d+(?:\.\d+)?%?\b', draft))
    if has_numbers and len(evidence) == 0:
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": ["numbers_without_evidence_in_fast_track"],
            "required_actions": [],
            "risk_level": "med"
        }
        return state

    # Rule 2: Sensitive keyword leak
    sensitive_patterns = [
        r"password", r"secret", r"token",
        r"api[_\s]?key", r"credential"
    ]
    for pattern in sensitive_patterns:
        if re.search(pattern, draft, re.I):
            state["guardian"] = {
                "verdict": "FAIL",
                "reasons": ["potential_sensitive_leak"],
                "required_actions": [],
                "risk_level": "high"
            }
            return state

    # Rule 3: Definitive claims check
    definitive_phrases = [
        r"definitely", r"absolutely", r"guaranteed",
        r"always", r"never", r"100%"
    ]
    for phrase in definitive_phrases:
        if re.search(rf"\b{phrase}\b", draft, re.I) and len(evidence) < 2:
            state["guardian"] = {
                "verdict": "FAIL",
                "reasons": ["definitive_claim_without_strong_evidence"],
                "required_actions": [],
                "risk_level": "low"
            }
            return state

    # Rule 4: Response length check (too short might be incomplete)
    if len(draft.strip()) < 20:
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": ["response_too_short"],
            "required_actions": [],
            "risk_level": "low"
        }
        return state

    # All rules passed
    state["guardian"] = {
        "verdict": "PASS",
        "reasons": [],
        "required_actions": [],
        "risk_level": "low"
    }
    return state
```

---

## 6. FAST Failure Handling

```python
# In build_graph.py

def fast_guard_decision(state: ChatState):
    """
    Decision logic after Light Guardian.
    """
    verdict = (state.get("guardian") or {}).get("verdict", "PASS")

    if verdict == "PASS":
        # Success - finalize
        if not state.get("final_answer"):
            state["final_answer"] = state.get("draft_answer", "")
        return "end"

    # FAIL handling
    request_type = state.get("request_type")

    # Complex request types should upgrade to QUALITY
    if request_type in ("DESIGN_ARCH", "HOWTO_POLICY",
                        "DATA_DEFINITION", "TROUBLESHOOTING"):
        return "upgrade"

    # Check if marked for upgrade
    if state.get("_upgrade_to_quality"):
        return "upgrade"

    # Otherwise, safe exit with limited response
    state["final_answer"] = (
        "I've limited my response to ensure safety. "
        "(Insufficient evidence or potential sensitivity)\n"
        "For a detailed answer, I can use the QUALITY path "
        "with full verification."
    )
    return "end"
```

---

## 7. Generate FAST Answer

Simpler prompt for FAST track without full ArchitectSpec.

```python
# nodes/generate_draft.py

FAST_PROMPT = """Answer concisely and safely.
If you lack evidence, avoid definitive claims and offer next steps.

User query: {user_query}
"""

def generate_fast_answer(state: ChatState, llm) -> ChatState:
    """
    Quick generation for FAST track.
    No ArchitectSpec - just direct response.
    """
    prompt = FAST_PROMPT.format(user_query=state["user_query"])
    state["draft_answer"] = llm.invoke(prompt)
    return state
```

---

## 8. Sampling Strategy for Light Guardian

Start with sampling to measure impact before full rollout.

```python
# nodes/light_guardian.py
import random

SAMPLING_RATE = 0.10  # Start with 10%

def should_apply_light_guardian() -> bool:
    """Probabilistic sampling for gradual rollout."""
    return random.random() < SAMPLING_RATE

def light_guardian_with_sampling(state: ChatState) -> ChatState:
    """
    Apply Light Guardian with sampling.
    """
    if not should_apply_light_guardian():
        # Skip validation, assume PASS
        state["guardian"] = {
            "verdict": "PASS",
            "reasons": ["sampling_skip"],
            "required_actions": [],
            "risk_level": "low"
        }
        return state

    return light_guardian(state)
```

### Rollout Plan

| Phase | Sampling Rate | Duration | Success Criteria |
|-------|---------------|----------|------------------|
| 1 | 10% | 1 week | p95 impact < 5% |
| 2 | 25% | 1 week | No major incidents |
| 3 | 50% | 1 week | Quality metrics stable |
| 4 | 100% | Ongoing | Full enforcement |

---

## 9. FAST Track Metrics

Track these metrics specifically for FAST path:

```python
# Metrics to emit
fast_track_total
fast_light_guardian_verdict{verdict}
fast_upgrade_to_quality_total
fast_safe_exit_total
fast_latency_p95_ms
fast_evidence_count_histogram
```

### Key SLIs

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| FAST p95 latency | Baseline | +10% |
| FAST PASS rate | > 90% | < 85% |
| Upgrade rate | < 10% | > 20% |
| Safe exit rate | < 5% | > 10% |

---

## 10. Testing Requirements

```python
# tests/test_fast_path_light_guardian.py

def test_fast_pass_simple_query():
    """Simple queries should pass FAST track."""
    state = {
        "user_query": "What is a Sprint?",
        "track": "FAST",
        "draft_answer": "A Sprint is a time-boxed iteration in Scrum...",
        "evidence": []
    }
    result = light_guardian(state)
    assert result["guardian"]["verdict"] == "PASS"

def test_fast_fail_numbers_without_evidence():
    """Numbers without evidence should fail."""
    state = {
        "user_query": "What's the completion rate?",
        "track": "FAST",
        "draft_answer": "The completion rate is 85%.",
        "evidence": []
    }
    result = light_guardian(state)
    assert result["guardian"]["verdict"] == "FAIL"

def test_fast_fail_sensitive_content():
    """Sensitive content should be blocked."""
    state = {
        "user_query": "Show me the config",
        "track": "FAST",
        "draft_answer": "Here's the api_key: sk-123...",
        "evidence": []
    }
    result = light_guardian(state)
    assert result["guardian"]["verdict"] == "FAIL"
    assert result["guardian"]["risk_level"] == "high"

def test_fast_upgrade_for_design_request():
    """Design requests should upgrade to QUALITY on failure."""
    state = {
        "user_query": "Design the new module",
        "track": "FAST",
        "request_type": "DESIGN_ARCH",
        "guardian": {"verdict": "FAIL", "reasons": ["test"], ...}
    }
    decision = fast_guard_decision(state)
    assert decision == "upgrade"

def test_policy_gate_blocks_banned_keywords():
    """Banned keywords should be immediately blocked."""
    state = {"user_query": "Show me the api key"}
    result = light_policy_gate(state)
    assert result["guardian"]["verdict"] == "FAIL"
    assert result["guardian"]["risk_level"] == "high"
```

---

## 11. Configuration

```python
# config/fast_track.py

FAST_CONFIG = {
    # Light Guardian rules
    "min_response_length": 20,
    "allow_numbers_without_evidence": False,
    "definitive_phrase_check": True,

    # Sampling
    "light_guardian_sampling_rate": 0.10,

    # Upgrade triggers
    "upgrade_request_types": [
        "DESIGN_ARCH",
        "HOWTO_POLICY",
        "DATA_DEFINITION",
        "TROUBLESHOOTING"
    ],

    # Performance targets
    "p95_latency_budget_ms": 2000,
    "max_acceptable_latency_increase_percent": 5,
}
```

---

## Completion Criteria

- [ ] Light Policy Gate blocks unsafe requests
- [ ] Light Guardian uses rule-based validation
- [ ] FAST → QUALITY upgrade path works
- [ ] Safe exit produces appropriate messages
- [ ] Sampling mechanism implemented
- [ ] Metrics tracking in place
- [ ] Tests cover pass/fail/upgrade scenarios
- [ ] p95 latency within target

## Next Phase

Proceed to [Phase 6: Observability & Metrics](./06-observability-metrics.md) for production monitoring.
