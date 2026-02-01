# Phase 3: Observability

## Document Info
| Item | Value |
|------|-------|
| Phase | 3 of 3 |
| Duration | 1 week |
| Status | Planning |
| Prerequisites | Phase 1, Phase 2 Complete |

---

## 1. Objectives

Achieve production readiness with comprehensive observability:
- **LLM Tracing**: Full visibility into LLM call chains
- **Cost Tracking**: Real-time token usage and cost monitoring
- **Quality Metrics**: Dashboard for generation accuracy and performance
- **Alerting**: Automated alerts for quality degradation

---

## 2. Architecture Overview

### Observability Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Text2Query Service                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ Intent   │→ │ Reasoning│→ │ Generate │→ │ Correct/Execute ││
│  │ Classify │  │  (CoT)   │  │   SQL    │  │                  ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘│
│       │             │             │                  │          │
│       └─────────────┴─────────────┴──────────────────┘          │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │   Tracer    │                              │
│                    │ (Langfuse)  │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│      Langfuse Cloud     │   │    Prometheus/Grafana   │
│  ├─ Trace Explorer      │   │  ├─ Custom Metrics      │
│  ├─ Cost Analytics      │   │  ├─ SLO Dashboards      │
│  ├─ Quality Scores      │   │  ├─ Alerting Rules      │
│  └─ Prompt Versions     │   │  └─ Long-term Storage   │
└─────────────────────────┘   └─────────────────────────┘
```

---

## 3. Deliverables

### 3.1 Langfuse Integration

#### 3.1.1 Tracer Configuration

**File**: `llm-service/observability/langfuse_tracer.py`

```python
"""
Langfuse Tracer Integration

Comprehensive LLM tracing for Text2Query pipeline.
"""
import os
from typing import Optional, Dict, Any, Callable
from functools import wraps
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager

from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

# Environment configuration
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_HOST = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

# Initialize client
langfuse_client: Optional[Langfuse] = None


def get_langfuse() -> Optional[Langfuse]:
    """Get or create Langfuse client singleton."""
    global langfuse_client

    if langfuse_client is None and LANGFUSE_SECRET_KEY:
        langfuse_client = Langfuse(
            secret_key=LANGFUSE_SECRET_KEY,
            public_key=LANGFUSE_PUBLIC_KEY,
            host=LANGFUSE_HOST,
            enabled=True,
            sample_rate=1.0  # Trace 100% in production
        )

    return langfuse_client


class Text2QueryTracer:
    """
    Tracer for Text2Query pipeline.

    Provides:
    - Trace context management
    - LLM call instrumentation
    - Cost tracking
    - Quality scoring
    """

    def __init__(self):
        self.langfuse = get_langfuse()
        self._current_trace = None

    @asynccontextmanager
    async def trace_query(
        self,
        question: str,
        project_id: int,
        user_id: int,
        session_id: Optional[str] = None
    ):
        """
        Context manager for tracing a complete query.

        Usage:
            async with tracer.trace_query(question, project_id, user_id) as trace:
                # ... query processing ...
                trace.score("accuracy", 0.95)
        """
        if not self.langfuse:
            yield NullTrace()
            return

        trace = self.langfuse.trace(
            name="text2query",
            user_id=str(user_id),
            session_id=session_id,
            metadata={
                "project_id": project_id,
                "question": question,
                "timestamp": datetime.utcnow().isoformat()
            },
            tags=["text2query", f"project:{project_id}"]
        )

        self._current_trace = trace

        try:
            yield TraceContext(trace, self.langfuse)
        finally:
            self._current_trace = None
            # Flush to ensure trace is sent
            self.langfuse.flush()

    def span(
        self,
        name: str,
        input_data: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ):
        """Create a span within current trace."""
        if not self._current_trace:
            return NullSpan()

        return self._current_trace.span(
            name=name,
            input=input_data,
            metadata=metadata
        )

    def generation(
        self,
        name: str,
        model: str,
        input_messages: list,
        output: str,
        usage: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ):
        """Record an LLM generation."""
        if not self._current_trace:
            return

        self._current_trace.generation(
            name=name,
            model=model,
            input=input_messages,
            output=output,
            usage=usage,
            metadata=metadata
        )


class TraceContext:
    """Context for an active trace."""

    def __init__(self, trace, langfuse: Langfuse):
        self.trace = trace
        self.langfuse = langfuse
        self._spans = []

    def span(self, name: str, **kwargs):
        """Create a child span."""
        span = self.trace.span(name=name, **kwargs)
        self._spans.append(span)
        return span

    def generation(self, name: str, **kwargs):
        """Record an LLM generation."""
        return self.trace.generation(name=name, **kwargs)

    def score(self, name: str, value: float, comment: Optional[str] = None):
        """Add a score to the trace."""
        self.trace.score(
            name=name,
            value=value,
            comment=comment
        )

    def update(self, **kwargs):
        """Update trace metadata."""
        self.trace.update(**kwargs)

    def set_output(self, output: Any):
        """Set trace output."""
        self.trace.update(output=output)


class NullTrace:
    """Null object for disabled tracing."""

    def span(self, *args, **kwargs):
        return NullSpan()

    def generation(self, *args, **kwargs):
        pass

    def score(self, *args, **kwargs):
        pass

    def update(self, *args, **kwargs):
        pass

    def set_output(self, *args, **kwargs):
        pass


class NullSpan:
    """Null object for disabled spans."""

    def end(self, *args, **kwargs):
        pass

    def update(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


# Decorator for tracing LLM calls
def trace_llm_call(name: str, model: str = "gemma-3-12b"):
    """Decorator for tracing LLM generation calls."""

    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            tracer = get_tracer()

            # Extract input from args/kwargs
            prompt = kwargs.get("prompt", args[0] if args else "")

            span = tracer.span(
                name=name,
                input_data={"prompt": prompt[:500]}  # Truncate for storage
            )

            start_time = datetime.utcnow()
            try:
                result = await func(*args, **kwargs)

                # Extract usage if available
                usage = None
                if hasattr(result, "usage"):
                    usage = {
                        "input": result.usage.prompt_tokens,
                        "output": result.usage.completion_tokens,
                        "total": result.usage.total_tokens
                    }

                tracer.generation(
                    name=name,
                    model=model,
                    input_messages=[{"role": "user", "content": prompt[:500]}],
                    output=str(result)[:1000],
                    usage=usage,
                    metadata={
                        "latency_ms": (datetime.utcnow() - start_time).total_seconds() * 1000
                    }
                )

                span.end(output=str(result)[:500])
                return result

            except Exception as e:
                span.end(
                    output={"error": str(e)},
                    level="ERROR"
                )
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return asyncio.get_event_loop().run_until_complete(
                async_wrapper(*args, **kwargs)
            )

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# Global tracer instance
_tracer: Optional[Text2QueryTracer] = None


def get_tracer() -> Text2QueryTracer:
    """Get or create tracer singleton."""
    global _tracer
    if _tracer is None:
        _tracer = Text2QueryTracer()
    return _tracer
```

#### 3.1.2 Workflow Integration

**File**: `llm-service/observability/traced_workflow.py`

```python
"""
Traced Workflow Wrapper

Integrates Langfuse tracing into Text2Query workflow.
"""
from typing import Dict, Any
from .langfuse_tracer import get_tracer, trace_llm_call


class TracedText2QueryWorkflow:
    """
    Wrapper that adds tracing to Text2Query workflow.

    Records:
    - Full query lifecycle
    - Each pipeline stage (intent, reasoning, generation, correction)
    - LLM calls with token usage
    - Final quality scores
    """

    def __init__(self, workflow):
        self.workflow = workflow
        self.tracer = get_tracer()

    async def run(
        self,
        question: str,
        project_id: int,
        user_id: int,
        session_id: str = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Run workflow with full tracing."""

        async with self.tracer.trace_query(
            question=question,
            project_id=project_id,
            user_id=user_id,
            session_id=session_id
        ) as trace:

            # Record intent classification
            intent_span = trace.span(
                name="intent_classification",
                input_data={"question": question}
            )

            # Run workflow
            try:
                result = await self.workflow.ainvoke({
                    "question": question,
                    "project_id": project_id,
                    "user_id": user_id,
                    **kwargs
                })

                # Record stages
                if result.get("intent"):
                    intent_span.end(output={
                        "intent": result["intent"].value,
                        "confidence": result.get("intent_confidence", 0)
                    })

                if result.get("reasoning"):
                    trace.span(
                        name="reasoning",
                        input_data={"question": question},
                    ).end(output={
                        "complexity": result["reasoning"].estimated_complexity,
                        "steps": len(result["reasoning"].steps)
                    })

                if result.get("generated_query"):
                    trace.span(
                        name="sql_generation",
                        input_data={"tables": result.get("relevant_tables", [])}
                    ).end(output={
                        "sql": result["generated_query"][:200],
                        "valid": result.get("is_valid", False)
                    })

                if result.get("correction_attempts", 0) > 0:
                    trace.span(
                        name="correction",
                        input_data={"original_error": result.get("error")}
                    ).end(output={
                        "attempts": result["correction_attempts"],
                        "success": result.get("is_valid", False)
                    })

                # Score the result
                if result.get("is_valid"):
                    trace.score("query_valid", 1.0)
                else:
                    trace.score("query_valid", 0.0, comment=result.get("error"))

                if result.get("generation_response"):
                    trace.score(
                        "confidence",
                        result["generation_response"].confidence
                    )

                # Set final output
                trace.set_output({
                    "success": result.get("is_valid", False),
                    "sql": result.get("final_query"),
                    "intent": result.get("intent", "").value if result.get("intent") else None
                })

                return result

            except Exception as e:
                trace.score("query_valid", 0.0, comment=str(e))
                trace.update(
                    output={"error": str(e)},
                    level="ERROR"
                )
                raise
```

---

### 3.2 Prometheus Metrics

#### 3.2.1 Metrics Definitions

**File**: `llm-service/observability/metrics.py`

```python
"""
Prometheus Metrics for Text2Query

Custom metrics for monitoring LLM quality and performance.
"""
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Summary,
    REGISTRY,
    generate_latest
)
from functools import wraps
import time


# Query metrics
QUERY_TOTAL = Counter(
    "text2query_queries_total",
    "Total number of Text2Query requests",
    ["intent", "status"]  # status: success, failed, timeout
)

QUERY_LATENCY = Histogram(
    "text2query_query_latency_seconds",
    "Query processing latency",
    ["stage"],  # stage: intent, reasoning, generation, validation, correction, execution
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

# LLM metrics
LLM_CALLS_TOTAL = Counter(
    "text2query_llm_calls_total",
    "Total LLM API calls",
    ["operation", "model"]  # operation: intent, reasoning, generation, correction
)

LLM_TOKENS_TOTAL = Counter(
    "text2query_llm_tokens_total",
    "Total tokens consumed",
    ["type", "model"]  # type: input, output
)

LLM_LATENCY = Histogram(
    "text2query_llm_latency_seconds",
    "LLM call latency",
    ["operation"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

LLM_ERRORS = Counter(
    "text2query_llm_errors_total",
    "LLM API errors",
    ["operation", "error_type"]
)

# Quality metrics
VALIDATION_RESULTS = Counter(
    "text2query_validation_results_total",
    "SQL validation results",
    ["result", "error_category"]  # result: valid, invalid
)

CORRECTION_ATTEMPTS = Histogram(
    "text2query_correction_attempts",
    "Number of correction attempts before success/failure",
    ["result"],  # result: success, failed
    buckets=[1, 2, 3]
)

QUERY_CONFIDENCE = Summary(
    "text2query_query_confidence",
    "Query generation confidence scores"
)

# Cost metrics
LLM_COST_DOLLARS = Counter(
    "text2query_llm_cost_dollars_total",
    "Estimated LLM cost in dollars",
    ["model"]
)

# Active queries
ACTIVE_QUERIES = Gauge(
    "text2query_active_queries",
    "Currently processing queries"
)


# Cost calculation (per 1K tokens)
MODEL_COSTS = {
    "gemma-3-12b": {"input": 0.0, "output": 0.0},  # Local model
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "claude-3-sonnet": {"input": 0.003, "output": 0.015},
}


def track_tokens(model: str, input_tokens: int, output_tokens: int):
    """Track token usage and estimate cost."""
    LLM_TOKENS_TOTAL.labels(type="input", model=model).inc(input_tokens)
    LLM_TOKENS_TOTAL.labels(type="output", model=model).inc(output_tokens)

    # Calculate cost
    if model in MODEL_COSTS:
        cost = (
            (input_tokens / 1000) * MODEL_COSTS[model]["input"] +
            (output_tokens / 1000) * MODEL_COSTS[model]["output"]
        )
        LLM_COST_DOLLARS.labels(model=model).inc(cost)


def track_query(intent: str, success: bool, latency: float):
    """Track query completion."""
    status = "success" if success else "failed"
    QUERY_TOTAL.labels(intent=intent, status=status).inc()
    QUERY_LATENCY.labels(stage="total").observe(latency)


def track_llm_call(operation: str, model: str = "gemma-3-12b"):
    """Decorator to track LLM calls."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            LLM_CALLS_TOTAL.labels(operation=operation, model=model).inc()
            ACTIVE_QUERIES.inc()

            start_time = time.time()
            try:
                result = await func(*args, **kwargs)

                latency = time.time() - start_time
                LLM_LATENCY.labels(operation=operation).observe(latency)

                # Track tokens if available
                if hasattr(result, "usage"):
                    track_tokens(
                        model=model,
                        input_tokens=result.usage.prompt_tokens,
                        output_tokens=result.usage.completion_tokens
                    )

                return result

            except Exception as e:
                error_type = type(e).__name__
                LLM_ERRORS.labels(operation=operation, error_type=error_type).inc()
                raise

            finally:
                ACTIVE_QUERIES.dec()

        return wrapper
    return decorator


def track_validation(valid: bool, error_category: str = "none"):
    """Track validation result."""
    result = "valid" if valid else "invalid"
    VALIDATION_RESULTS.labels(result=result, error_category=error_category).inc()


def track_correction(attempts: int, success: bool):
    """Track correction attempts."""
    result = "success" if success else "failed"
    CORRECTION_ATTEMPTS.labels(result=result).observe(attempts)


def track_confidence(confidence: float):
    """Track query confidence score."""
    QUERY_CONFIDENCE.observe(confidence)


def get_metrics():
    """Get all metrics in Prometheus format."""
    return generate_latest(REGISTRY)
```

#### 3.2.2 Metrics Endpoint

**File**: `llm-service/api/metrics_endpoint.py`

```python
"""
Prometheus Metrics Endpoint

Exposes /metrics endpoint for Prometheus scraping.
"""
from flask import Blueprint, Response
from ..observability.metrics import get_metrics

metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.route("/metrics")
def prometheus_metrics():
    """Expose Prometheus metrics."""
    return Response(
        get_metrics(),
        mimetype="text/plain; charset=utf-8"
    )
```

---

### 3.3 Grafana Dashboard

#### 3.3.1 Dashboard Configuration

**File**: `infrastructure/grafana/dashboards/text2query.json`

```json
{
  "dashboard": {
    "title": "Text2Query Observability",
    "tags": ["llm", "text2query", "ai"],
    "timezone": "browser",
    "refresh": "30s",
    "panels": [
      {
        "title": "Query Volume",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(text2query_queries_total[5m])) by (intent)",
            "legendFormat": "{{intent}}"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "stat",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(text2query_queries_total{status=\"success\"}[1h])) / sum(rate(text2query_queries_total[1h])) * 100"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 80, "color": "yellow" },
                { "value": 95, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "title": "Average Latency (P95)",
        "type": "stat",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(text2query_query_latency_seconds_bucket{stage=\"total\"}[5m])) by (le))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 2, "color": "yellow" },
                { "value": 5, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "LLM Token Usage",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 8, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(text2query_llm_tokens_total[5m])) by (type)",
            "legendFormat": "{{type}} tokens"
          }
        ]
      },
      {
        "title": "Estimated Daily Cost",
        "type": "stat",
        "gridPos": { "x": 12, "y": 4, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(increase(text2query_llm_cost_dollars_total[24h]))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        }
      },
      {
        "title": "Correction Attempts Distribution",
        "type": "piechart",
        "gridPos": { "x": 18, "y": 4, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(text2query_correction_attempts_bucket) by (le, result)",
            "legendFormat": "{{le}} attempts ({{result}})"
          }
        ]
      },
      {
        "title": "Validation Errors by Category",
        "type": "barchart",
        "gridPos": { "x": 0, "y": 16, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(increase(text2query_validation_results_total{result=\"invalid\"}[24h])) by (error_category)",
            "legendFormat": "{{error_category}}"
          }
        ]
      },
      {
        "title": "LLM Latency by Operation",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 8, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(text2query_llm_latency_seconds_bucket[5m])) by (le, operation))",
            "legendFormat": "{{operation}} P95"
          }
        ]
      },
      {
        "title": "Confidence Score Distribution",
        "type": "histogram",
        "gridPos": { "x": 12, "y": 16, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "text2query_query_confidence"
          }
        ]
      }
    ]
  }
}
```

---

### 3.4 Alerting Rules

#### 3.4.1 Prometheus Alert Rules

**File**: `infrastructure/prometheus/alerts/text2query.yml`

```yaml
groups:
  - name: text2query_alerts
    rules:
      # High Error Rate
      - alert: Text2QueryHighErrorRate
        expr: |
          sum(rate(text2query_queries_total{status="failed"}[5m])) /
          sum(rate(text2query_queries_total[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Text2Query error rate is high"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 10%)"

      # Critical Error Rate
      - alert: Text2QueryCriticalErrorRate
        expr: |
          sum(rate(text2query_queries_total{status="failed"}[5m])) /
          sum(rate(text2query_queries_total[5m])) > 0.25
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Text2Query error rate is critical"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 25%)"

      # High Latency
      - alert: Text2QueryHighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(text2query_query_latency_seconds_bucket{stage="total"}[5m])) by (le)
          ) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Text2Query P95 latency is high"
          description: "P95 latency is {{ $value | humanizeDuration }} (threshold: 5s)"

      # LLM Errors
      - alert: Text2QueryLLMErrors
        expr: |
          sum(rate(text2query_llm_errors_total[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "LLM API errors detected"
          description: "{{ $value }} errors per second"

      # Low Confidence Scores
      - alert: Text2QueryLowConfidence
        expr: |
          avg(text2query_query_confidence) < 0.7
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Average query confidence is low"
          description: "Average confidence: {{ $value | humanizePercentage }} (threshold: 70%)"

      # High Correction Rate
      - alert: Text2QueryHighCorrectionRate
        expr: |
          sum(rate(text2query_correction_attempts_bucket{le="3"}[5m])) /
          sum(rate(text2query_queries_total[5m])) > 0.3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High SQL correction rate"
          description: "{{ $value | humanizePercentage }} of queries require correction"

      # Cost Spike
      - alert: Text2QueryCostSpike
        expr: |
          sum(increase(text2query_llm_cost_dollars_total[1h])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "LLM cost spike detected"
          description: "Hourly cost: ${{ $value | humanize }}"

      # Service Down
      - alert: Text2QueryServiceDown
        expr: |
          up{job="text2query"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Text2Query service is down"
          description: "Text2Query service has been down for more than 1 minute"
```

---

## 4. Implementation Tasks

### Week 5: Complete Observability Stack

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| D1 | Langfuse setup + config | DevOps | `langfuse_tracer.py`, env vars |
| D2 | Workflow tracing integration | AI Dev | `traced_workflow.py` |
| D3 | Prometheus metrics | AI Dev | `metrics.py`, `/metrics` endpoint |
| D4 | Grafana dashboard | DevOps | `text2query.json` |
| D5 | Alert rules + testing | DevOps | `text2query.yml`, runbook |

---

## 5. Configuration

### 5.1 Environment Variables

```bash
# Langfuse Configuration
LANGFUSE_SECRET_KEY=sk-lf-xxxxx
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxx
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_SAMPLE_RATE=1.0  # 100% tracing in production

# Prometheus Configuration
PROMETHEUS_MULTIPROC_DIR=/tmp/prometheus_metrics
METRICS_PORT=9090

# Alert Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx
PAGERDUTY_ROUTING_KEY=xxxxx
```

### 5.2 Docker Compose Addition

```yaml
# docker-compose.observability.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.45.0
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    volumes:
      - ./infrastructure/grafana/provisioning:/etc/grafana/provisioning
      - ./infrastructure/grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false

  alertmanager:
    image: prom/alertmanager:v0.25.0
    ports:
      - "9093:9093"
    volumes:
      - ./infrastructure/alertmanager:/etc/alertmanager

volumes:
  prometheus_data:
  grafana_data:
```

---

## 6. Quality Metrics SLOs

### 6.1 Service Level Objectives

| Metric | SLO | Measurement Window |
|--------|-----|-------------------|
| Query Success Rate | >= 95% | Rolling 24 hours |
| P95 Latency | <= 5 seconds | Rolling 1 hour |
| LLM Error Rate | <= 1% | Rolling 1 hour |
| Average Confidence | >= 75% | Rolling 24 hours |
| Correction Success | >= 80% | Rolling 24 hours |

### 6.2 SLO Dashboard

```promql
# Error Budget Remaining
(1 - (
  sum(increase(text2query_queries_total{status="failed"}[30d])) /
  sum(increase(text2query_queries_total[30d]))
)) / 0.05 * 100

# Latency Budget
histogram_quantile(0.95,
  sum(rate(text2query_query_latency_seconds_bucket{stage="total"}[30d])) by (le)
) / 5 * 100
```

---

## 7. Test Plan

### 7.1 Tracing Tests

```python
# tests/test_observability.py

@pytest.mark.asyncio
async def test_trace_created_for_query():
    """Verify trace is created for each query."""
    tracer = get_tracer()

    async with tracer.trace_query(
        question="Test query",
        project_id=1,
        user_id=1
    ) as trace:
        trace.span("test_span").end()
        trace.score("test_score", 0.5)

    # Verify trace was sent
    # (Would need mock Langfuse client)

@pytest.mark.asyncio
async def test_metrics_recorded():
    """Verify metrics are recorded."""
    from observability.metrics import QUERY_TOTAL

    initial_count = QUERY_TOTAL.labels(intent="TEXT_TO_SQL", status="success")._value.get()

    # Run a query
    await workflow.run(question="test", project_id=1, user_id=1)

    new_count = QUERY_TOTAL.labels(intent="TEXT_TO_SQL", status="success")._value.get()
    assert new_count > initial_count
```

### 7.2 Alert Tests

```python
# tests/test_alerts.py

def test_high_error_rate_alert_fires():
    """Test alert fires when error rate exceeds threshold."""
    # Simulate high error rate
    for _ in range(20):
        QUERY_TOTAL.labels(intent="TEXT_TO_SQL", status="failed").inc()
    for _ in range(80):
        QUERY_TOTAL.labels(intent="TEXT_TO_SQL", status="success").inc()

    # Check alert would fire (20% > 10% threshold)
    error_rate = calculate_error_rate()
    assert error_rate > 0.1
```

---

## 8. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tracing coverage | 100% | All queries have traces |
| Metrics availability | 99.9% | `/metrics` endpoint uptime |
| Alert latency | < 5 min | Time from issue to alert |
| Dashboard load time | < 3s | Grafana panel render |

---

## 9. Runbook

### 9.1 High Error Rate

**Alert**: `Text2QueryHighErrorRate`

**Investigation Steps**:
1. Check Langfuse for recent trace errors
2. Review error distribution by category in Grafana
3. Check LLM service health (`/health` endpoint)
4. Review recent deployments

**Mitigation**:
1. If LLM timeout: Increase timeout, check model load
2. If validation errors: Check schema changes
3. If API errors: Check credentials, rate limits

### 9.2 High Latency

**Alert**: `Text2QueryHighLatency`

**Investigation Steps**:
1. Check LLM latency breakdown by operation
2. Review active query count
3. Check database connection pool
4. Review vector DB latency

**Mitigation**:
1. Scale LLM service if CPU-bound
2. Increase connection pool if DB-bound
3. Add caching for frequent queries

### 9.3 Cost Spike

**Alert**: `Text2QueryCostSpike`

**Investigation Steps**:
1. Check token usage by operation
2. Review query volume changes
3. Check for prompt injection attempts
4. Review reasoning step usage

**Mitigation**:
1. Enable reasoning only for complex queries
2. Reduce max tokens if responses are verbose
3. Add query caching for common questions
