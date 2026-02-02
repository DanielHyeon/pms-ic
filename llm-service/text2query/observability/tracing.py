"""
LLM Tracing Module

Provides distributed tracing for LLM operations using OpenTelemetry-compatible interfaces.
Supports integration with Langfuse, Jaeger, and other tracing backends.
"""
import logging
import time
import uuid
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from functools import wraps
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class SpanKind(str, Enum):
    """Types of spans in the trace."""
    LLM_CALL = "llm_call"
    QUERY_GENERATION = "query_generation"
    QUERY_VALIDATION = "query_validation"
    QUERY_CORRECTION = "query_correction"
    QUERY_EXECUTION = "query_execution"
    INTENT_CLASSIFICATION = "intent_classification"
    REASONING = "reasoning"
    FEWSHOT_RETRIEVAL = "fewshot_retrieval"
    SEMANTIC_LOOKUP = "semantic_lookup"


class SpanStatus(str, Enum):
    """Status of a span."""
    OK = "ok"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class SpanContext:
    """
    Context for a trace span.

    Tracks timing, metadata, and hierarchy of operations.
    """
    span_id: str = field(default_factory=lambda: str(uuid.uuid4())[:16])
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:32])
    parent_span_id: Optional[str] = None
    name: str = ""
    kind: SpanKind = SpanKind.LLM_CALL
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    status: SpanStatus = SpanStatus.OK

    # Attributes
    attributes: Dict[str, Any] = field(default_factory=dict)
    events: List[Dict[str, Any]] = field(default_factory=list)

    # LLM-specific fields
    model_name: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    # Error tracking
    error_message: Optional[str] = None
    error_type: Optional[str] = None

    def end(self, status: SpanStatus = SpanStatus.OK, error: Optional[str] = None):
        """Mark span as completed."""
        self.end_time = datetime.now()
        self.status = status
        if error:
            self.error_message = error
            self.status = SpanStatus.ERROR

    @property
    def duration_ms(self) -> float:
        """Get span duration in milliseconds."""
        if self.end_time is None:
            return 0.0
        delta = self.end_time - self.start_time
        return delta.total_seconds() * 1000

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        """Add an event to the span."""
        self.events.append({
            "name": name,
            "timestamp": datetime.now().isoformat(),
            "attributes": attributes or {}
        })

    def set_attribute(self, key: str, value: Any):
        """Set a span attribute."""
        self.attributes[key] = value

    def to_dict(self) -> Dict[str, Any]:
        """Convert span to dictionary for export."""
        return {
            "span_id": self.span_id,
            "trace_id": self.trace_id,
            "parent_span_id": self.parent_span_id,
            "name": self.name,
            "kind": self.kind.value,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_ms": self.duration_ms,
            "status": self.status.value,
            "attributes": self.attributes,
            "events": self.events,
            "model_name": self.model_name,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "error_message": self.error_message,
            "error_type": self.error_type,
        }


class LLMTracer:
    """
    Tracer for LLM operations.

    Provides distributed tracing with support for:
    - OpenTelemetry exporters
    - Langfuse integration
    - Local file logging
    - Custom exporters

    Usage:
        tracer = LLMTracer()
        with tracer.start_span("generate_sql", SpanKind.QUERY_GENERATION) as span:
            span.set_attribute("question", question)
            result = generate_sql(question)
            span.set_attribute("result", result)
    """

    def __init__(
        self,
        service_name: str = "text2query",
        enable_console_export: bool = False,
        enable_file_export: bool = True,
        file_path: str = "traces.jsonl",
        custom_exporters: Optional[List[Callable[[SpanContext], None]]] = None
    ):
        """
        Initialize the tracer.

        Args:
            service_name: Name of the service for tracing
            enable_console_export: Log spans to console
            enable_file_export: Write spans to file
            file_path: Path for file export
            custom_exporters: Additional span exporters
        """
        self.service_name = service_name
        self.enable_console_export = enable_console_export
        self.enable_file_export = enable_file_export
        self.file_path = file_path
        self.custom_exporters = custom_exporters or []

        # Current trace context (thread-local in production)
        self._current_trace_id: Optional[str] = None
        self._current_span_id: Optional[str] = None
        self._span_stack: List[SpanContext] = []

        # Collected spans for batch export
        self._spans: List[SpanContext] = []
        self._max_spans = 1000  # Max spans to keep in memory

    @contextmanager
    def start_span(
        self,
        name: str,
        kind: SpanKind = SpanKind.LLM_CALL,
        attributes: Optional[Dict[str, Any]] = None
    ):
        """
        Start a new span as a context manager.

        Args:
            name: Name of the span
            kind: Type of operation
            attributes: Initial attributes

        Yields:
            SpanContext for the current operation
        """
        span = SpanContext(
            name=name,
            kind=kind,
            trace_id=self._current_trace_id or str(uuid.uuid4())[:32],
            parent_span_id=self._current_span_id
        )

        if attributes:
            span.attributes.update(attributes)

        # Set current context
        self._current_trace_id = span.trace_id
        previous_span_id = self._current_span_id
        self._current_span_id = span.span_id
        self._span_stack.append(span)

        try:
            yield span
            span.end(SpanStatus.OK)
        except Exception as e:
            span.end(SpanStatus.ERROR, str(e))
            span.error_type = type(e).__name__
            raise
        finally:
            # Export and restore context
            self._export_span(span)
            self._current_span_id = previous_span_id
            if self._span_stack:
                self._span_stack.pop()
            if not self._span_stack:
                self._current_trace_id = None

    def start_trace(self, name: str = "text2query_request") -> str:
        """
        Start a new trace.

        Returns:
            trace_id for the new trace
        """
        trace_id = str(uuid.uuid4())[:32]
        self._current_trace_id = trace_id
        logger.debug(f"Started trace: {trace_id} ({name})")
        return trace_id

    def end_trace(self):
        """End the current trace and export all spans."""
        self._current_trace_id = None
        self._current_span_id = None
        self._span_stack.clear()

    def record_llm_call(
        self,
        model: str,
        prompt: str,
        response: str,
        prompt_tokens: int,
        completion_tokens: int,
        duration_ms: float,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Record an LLM call directly without context manager.

        Args:
            model: Model name/ID
            prompt: Input prompt
            response: LLM response
            prompt_tokens: Input token count
            completion_tokens: Output token count
            duration_ms: Call duration in milliseconds
            metadata: Additional metadata
        """
        span = SpanContext(
            name=f"llm_call_{model}",
            kind=SpanKind.LLM_CALL,
            trace_id=self._current_trace_id or str(uuid.uuid4())[:32],
            parent_span_id=self._current_span_id,
            model_name=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens
        )

        span.set_attribute("prompt_length", len(prompt))
        span.set_attribute("response_length", len(response))
        span.set_attribute("prompt_preview", prompt[:200] + "..." if len(prompt) > 200 else prompt)
        span.set_attribute("response_preview", response[:200] + "..." if len(response) > 200 else response)

        if metadata:
            span.attributes.update(metadata)

        # Set timing manually
        span.end_time = datetime.now()

        self._export_span(span)

    def _export_span(self, span: SpanContext):
        """Export a span to configured backends."""
        # Store in memory
        self._spans.append(span)
        if len(self._spans) > self._max_spans:
            self._spans = self._spans[-self._max_spans:]

        span_dict = span.to_dict()
        span_dict["service"] = self.service_name

        # Console export
        if self.enable_console_export:
            status_emoji = "" if span.status == SpanStatus.OK else ""
            logger.info(
                f"{status_emoji} [{span.kind.value}] {span.name} "
                f"({span.duration_ms:.2f}ms)"
            )

        # File export
        if self.enable_file_export:
            try:
                import json
                with open(self.file_path, "a") as f:
                    f.write(json.dumps(span_dict) + "\n")
            except Exception as e:
                logger.warning(f"Failed to write trace to file: {e}")

        # Custom exporters
        for exporter in self.custom_exporters:
            try:
                exporter(span)
            except Exception as e:
                logger.warning(f"Custom exporter failed: {e}")

    def get_recent_spans(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent spans for debugging."""
        return [s.to_dict() for s in self._spans[-limit:]]

    def get_trace_summary(self, trace_id: str) -> Dict[str, Any]:
        """Get summary of a trace."""
        trace_spans = [s for s in self._spans if s.trace_id == trace_id]

        if not trace_spans:
            return {"error": "Trace not found"}

        total_duration = sum(s.duration_ms for s in trace_spans)
        total_tokens = sum(s.total_tokens for s in trace_spans)
        error_count = sum(1 for s in trace_spans if s.status == SpanStatus.ERROR)

        return {
            "trace_id": trace_id,
            "span_count": len(trace_spans),
            "total_duration_ms": total_duration,
            "total_tokens": total_tokens,
            "error_count": error_count,
            "spans": [s.to_dict() for s in trace_spans]
        }


# Singleton instance
_tracer: Optional[LLMTracer] = None


def get_tracer(**kwargs) -> LLMTracer:
    """Get or create the tracer singleton."""
    global _tracer
    if _tracer is None:
        _tracer = LLMTracer(**kwargs)
    return _tracer


def reset_tracer() -> None:
    """Reset the tracer singleton (for testing)."""
    global _tracer
    _tracer = None


def trace_llm_call(span_name: str = "llm_call", kind: SpanKind = SpanKind.LLM_CALL):
    """
    Decorator for tracing LLM operations.

    Usage:
        @trace_llm_call("generate_sql", SpanKind.QUERY_GENERATION)
        def generate_sql(question: str) -> str:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            tracer = get_tracer()
            with tracer.start_span(span_name, kind) as span:
                start = time.time()
                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("success", True)
                    return result
                except Exception as e:
                    span.set_attribute("success", False)
                    span.set_attribute("error", str(e))
                    raise
                finally:
                    span.set_attribute("duration_ms", (time.time() - start) * 1000)
        return wrapper
    return decorator
