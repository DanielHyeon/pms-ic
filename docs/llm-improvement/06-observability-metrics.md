# Phase 6: Observability & Metrics

## Objective

Implement comprehensive observability to track BMAD effectiveness, identify bottlenecks, and enable data-driven quality improvements.

## Core Principle

> **If you can't measure it, you can't improve it.**
>
> Every BMAD decision should be traceable and measurable.

---

## 1. Implementation Checklist

- [ ] Create `nodes/observability.py` for timing wrapper
- [ ] Create `observability/tracing.py` for trace propagation
- [ ] Create `observability/metrics.py` for metric emission
- [ ] Implement `timings_ms` in ChatState
- [ ] Set up 5 core metrics dashboard
- [ ] Add trace_id to all state transitions
- [ ] Configure alerting thresholds

---

## 2. Core Metrics (Must Have)

### 2.1 Guardian Verdict Distribution

```python
# Metric: guardian_verdict_total
# Labels: track (FAST/QUALITY), verdict (PASS/RETRY/FAIL)

guardian_verdict_total{track="QUALITY", verdict="PASS"}
guardian_verdict_total{track="QUALITY", verdict="RETRY"}
guardian_verdict_total{track="QUALITY", verdict="FAIL"}
guardian_verdict_total{track="FAST", verdict="PASS"}
guardian_verdict_total{track="FAST", verdict="FAIL"}
```

**Purpose**: Track quality enforcement effectiveness

**Alert Thresholds**:
- QUALITY FAIL rate > 15% → Warning
- FAST FAIL rate > 10% → Warning
- RETRY rate > 30% → Investigate

### 2.2 Retry Count Histogram

```python
# Metric: retry_count_histogram
# Labels: track

retry_count_histogram{track="QUALITY", le="0"}
retry_count_histogram{track="QUALITY", le="1"}
retry_count_histogram{track="QUALITY", le="2"}
retry_count_histogram{track="QUALITY", le="3+"}
```

**Purpose**: Track retry loop efficiency

**Targets**:
- 70% of requests: 0 retries
- 25% of requests: 1 retry
- 5% of requests: 2+ retries

### 2.3 Policy Violation Counter

```python
# Metric: policy_violation_total
# Labels: type (banned_keyword, sensitive_topic, permission, etc.)

policy_violation_total{type="banned_keyword"}
policy_violation_total{type="sensitive_topic"}
policy_violation_total{type="permission_denied"}
policy_violation_total{type="evidence_forbidden_source"}
```

**Purpose**: Track policy enforcement and security

**Target**: 0 leakage (violations caught)

### 2.4 Evidence Coverage Ratio

```python
# Metric: evidence_coverage_ratio
# Labels: track, request_type

evidence_coverage_ratio{track="QUALITY", request_type="STATUS_METRIC"}
evidence_coverage_ratio{track="QUALITY", request_type="DESIGN_ARCH"}
```

**Purpose**: Track evidence-based response rate

**Targets**:
- QUALITY track: > 90% coverage
- FAST track: > 50% coverage

### 2.5 Node Timing

```python
# Metric: node_timing_ms
# Labels: node, track

node_timing_ms{node="router", track="QUALITY"}
node_timing_ms{node="analyst_plan", track="QUALITY"}
node_timing_ms{node="retrieve_evidence", track="QUALITY"}
node_timing_ms{node="architect_outline", track="QUALITY"}
node_timing_ms{node="generate_draft", track="QUALITY"}
node_timing_ms{node="guardian_verify", track="QUALITY"}
```

**Purpose**: Identify bottlenecks

**Alert**: Any node > 5000ms → Warning

---

## 3. Timing Wrapper Implementation

```python
# nodes/observability.py
from __future__ import annotations
from typing import Callable
import time
from contracts.state import ChatState

def time_node(
    name: str,
    state: ChatState,
    fn: Callable[[ChatState], ChatState]
) -> ChatState:
    """
    Wrapper to time node execution.
    Stores timing in state and emits metric.
    """
    t0 = time.time()
    out = fn(state)
    dt_ms = int((time.time() - t0) * 1000)

    # Store in state
    timings = out.get("timings_ms", {}) or {}
    timings[name] = dt_ms
    out["timings_ms"] = timings

    # Emit metric
    emit_timing_metric(name, out.get("track", "unknown"), dt_ms)

    return out

def emit_timing_metric(node: str, track: str, duration_ms: int):
    """Emit timing metric to observability backend."""
    # Implementation depends on your metrics backend
    # Example: Prometheus, DataDog, etc.
    pass
```

---

## 4. Trace ID Propagation

```python
# observability/tracing.py
import uuid
from contracts.state import ChatState

def init_trace(state: ChatState) -> ChatState:
    """Initialize trace ID for request tracking."""
    if not state.get("trace_id"):
        state["trace_id"] = str(uuid.uuid4())[:8]
    return state

def log_with_trace(state: ChatState, level: str, message: str, **kwargs):
    """Log with trace context."""
    trace_id = state.get("trace_id", "no-trace")
    track = state.get("track", "unknown")
    request_type = state.get("request_type", "unknown")

    log_entry = {
        "trace_id": trace_id,
        "track": track,
        "request_type": request_type,
        "message": message,
        **kwargs
    }

    # Log to your logging backend
    # logger.log(level, log_entry)
```

---

## 5. Metric Emission

```python
# observability/metrics.py
from typing import Dict, Any

class MetricsEmitter:
    """
    Centralized metrics emission.
    Adapt to your observability backend.
    """

    def emit_guardian_verdict(self, track: str, verdict: str):
        """Emit guardian verdict metric."""
        # guardian_verdict_total{track, verdict}
        pass

    def emit_retry_count(self, track: str, count: int):
        """Emit retry count histogram."""
        # retry_count_histogram{track}
        pass

    def emit_policy_violation(self, violation_type: str):
        """Emit policy violation counter."""
        # policy_violation_total{type}
        pass

    def emit_evidence_coverage(
        self,
        track: str,
        request_type: str,
        has_sufficient_evidence: bool
    ):
        """Emit evidence coverage ratio."""
        # evidence_coverage_ratio{track, request_type}
        pass

    def emit_node_timing(self, node: str, track: str, duration_ms: int):
        """Emit node timing histogram."""
        # node_timing_ms{node, track}
        pass

    def emit_request_complete(self, state: Dict[str, Any]):
        """Emit all metrics for completed request."""
        track = state.get("track", "unknown")
        guardian = state.get("guardian", {})

        self.emit_guardian_verdict(track, guardian.get("verdict", "unknown"))
        self.emit_retry_count(track, state.get("retry_count", 0))

        # Emit policy violations from reasons
        for reason in guardian.get("reasons", []):
            if "policy:" in reason:
                self.emit_policy_violation(reason)

        # Evidence coverage
        evidence = state.get("evidence", [])
        self.emit_evidence_coverage(
            track,
            state.get("request_type", "unknown"),
            len(evidence) >= 2 if track == "QUALITY" else len(evidence) >= 1
        )

# Global instance
metrics = MetricsEmitter()
```

---

## 6. Dashboard Design

### 6.1 Quality Overview Panel

```
┌─────────────────────────────────────────────────────┐
│  BMAD Quality Dashboard                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Guardian Verdicts (24h)                            │
│  ┌─────────────────────────────────────┐           │
│  │ PASS  ████████████████████ 85%      │           │
│  │ RETRY ████░░░░░░░░░░░░░░░░ 10%      │           │
│  │ FAIL  ██░░░░░░░░░░░░░░░░░░  5%      │           │
│  └─────────────────────────────────────┘           │
│                                                     │
│  Evidence Coverage                                  │
│  ┌─────────────────────────────────────┐           │
│  │ QUALITY Track: 92%                   │           │
│  │ FAST Track: 65%                      │           │
│  └─────────────────────────────────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 Performance Panel

```
┌─────────────────────────────────────────────────────┐
│  Node Latency (p95)                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  router:            150ms  ████                     │
│  analyst_plan:      800ms  ████████                 │
│  retrieve_evidence: 1200ms ████████████            │
│  architect_outline: 600ms  ██████                   │
│  generate_draft:    2000ms ████████████████████     │
│  guardian_verify:   300ms  ███                      │
│                                                     │
│  Total QUALITY p95: 5050ms                          │
│  Total FAST p95:    1800ms                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.3 Safety Panel

```
┌─────────────────────────────────────────────────────┐
│  Policy Violations (7d)                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  banned_keyword:       12 (blocked)                │
│  sensitive_topic:      45 (upgraded to QUALITY)    │
│  evidence_forbidden:   23 (retried)                │
│  permission_denied:     0                          │
│                                                     │
│  Leakage Events:        0 ✓                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 7. Alert Configuration

```yaml
# alerts/bmad_alerts.yaml

alerts:
  - name: high_fail_rate
    condition: guardian_verdict_total{verdict="FAIL"} / total > 0.15
    duration: 5m
    severity: warning
    message: "Guardian FAIL rate exceeds 15%"

  - name: retry_loop_explosion
    condition: avg(retry_count) > 1.5
    duration: 10m
    severity: warning
    message: "Average retry count exceeds 1.5"

  - name: latency_degradation
    condition: p95(total_latency_ms{track="FAST"}) > 3000
    duration: 5m
    severity: critical
    message: "FAST track p95 latency exceeds 3s"

  - name: evidence_coverage_drop
    condition: evidence_coverage_ratio{track="QUALITY"} < 0.85
    duration: 15m
    severity: warning
    message: "QUALITY track evidence coverage below 85%"

  - name: policy_leakage
    condition: policy_leakage_total > 0
    duration: 1m
    severity: critical
    message: "Policy violation leaked to response"
```

---

## 8. State Debugging

Store complete state for debugging failed requests:

```python
# observability/state_store.py
import json
from typing import Dict, Any
from datetime import datetime

class StateStore:
    """Store states for debugging and analysis."""

    def store_failed_state(self, state: Dict[str, Any]):
        """Store state when Guardian returns FAIL."""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "trace_id": state.get("trace_id"),
            "track": state.get("track"),
            "request_type": state.get("request_type"),
            "user_query": state.get("user_query"),
            "guardian_reasons": state.get("guardian", {}).get("reasons"),
            "evidence_count": len(state.get("evidence", [])),
            "retry_count": state.get("retry_count"),
            "timings_ms": state.get("timings_ms"),
        }

        # Store to your preferred backend
        # - Redis with TTL
        # - PostgreSQL for analysis
        # - S3 for archival

    def query_failed_states(
        self,
        start_time: datetime,
        end_time: datetime,
        reason_filter: str = None
    ):
        """Query failed states for analysis."""
        pass
```

---

## 9. Weekly Quality Report

Automated report generation:

```python
# observability/reports.py

def generate_weekly_report() -> dict:
    """Generate weekly quality report."""
    return {
        "period": "last_7_days",
        "summary": {
            "total_requests": get_total_requests(),
            "quality_track_percent": get_quality_track_percent(),
            "fast_track_percent": get_fast_track_percent(),
        },
        "quality_metrics": {
            "pass_rate": get_guardian_pass_rate("QUALITY"),
            "retry_rate": get_retry_rate("QUALITY"),
            "fail_rate": get_guardian_fail_rate("QUALITY"),
            "evidence_coverage": get_evidence_coverage("QUALITY"),
        },
        "fast_metrics": {
            "pass_rate": get_guardian_pass_rate("FAST"),
            "upgrade_rate": get_upgrade_rate(),
            "safe_exit_rate": get_safe_exit_rate(),
        },
        "performance": {
            "quality_p95_ms": get_p95_latency("QUALITY"),
            "fast_p95_ms": get_p95_latency("FAST"),
            "slowest_node": get_slowest_node(),
        },
        "safety": {
            "policy_violations_blocked": get_policy_violations(),
            "leakage_events": get_leakage_events(),
        },
        "trends": {
            "hallucination_rate_change": get_hallucination_trend(),
            "retry_rate_change": get_retry_trend(),
        }
    }
```

---

## 10. Testing Requirements

```python
# tests/test_observability.py

def test_timing_wrapper_records_duration():
    """Timing wrapper should record duration in state."""
    state = {"user_query": "test"}

    def dummy_node(s):
        time.sleep(0.1)
        return s

    result = time_node("test_node", state, dummy_node)

    assert "timings_ms" in result
    assert "test_node" in result["timings_ms"]
    assert result["timings_ms"]["test_node"] >= 100

def test_trace_id_propagation():
    """Trace ID should be consistent across state."""
    state = {}
    state = init_trace(state)

    assert "trace_id" in state
    assert len(state["trace_id"]) > 0

def test_metrics_emitter_captures_all():
    """Metrics emitter should capture complete state."""
    state = {
        "track": "QUALITY",
        "request_type": "DESIGN_ARCH",
        "guardian": {
            "verdict": "PASS",
            "reasons": [],
            "required_actions": [],
            "risk_level": "low"
        },
        "evidence": [{"source": "doc", ...}, {"source": "policy", ...}],
        "retry_count": 0
    }

    # Should not raise
    metrics.emit_request_complete(state)
```

---

## 11. KPI Targets

| KPI | Target | Current Baseline | Measurement |
|-----|--------|------------------|-------------|
| Hallucination rate | < 5% | TBD | Internal labeling |
| Evidence coverage (QUALITY) | > 90% | TBD | Automated |
| Policy violation leakage | 0 | TBD | Automated |
| FAST p95 latency | < 2s | TBD | Automated |
| User re-ask rate | < 10% | TBD | User analytics |
| QUALITY PASS rate | > 85% | TBD | Automated |

---

## Completion Criteria

- [ ] All 5 core metrics implemented
- [ ] Timing wrapper on all nodes
- [ ] Trace ID propagates through state
- [ ] Failed states stored for debugging
- [ ] Dashboard configured
- [ ] Alerts set up
- [ ] Weekly report generation automated
- [ ] Tests verify metric emission

## Final Summary

With Phase 6 complete, the BMAD implementation is production-ready with:

1. **Structural Enforcement**: State/Contract foundation
2. **Quality Gate**: Guardian system with RETRY loops
3. **Planning**: AnalystPlan eliminates blind retrieval
4. **Contracts**: ArchitectSpec eliminates unstructured generation
5. **Safety**: FAST track Light Guardian
6. **Visibility**: Full observability stack

The system has transformed from "hoping the model answers well" to "structurally preventing incorrect answers".
