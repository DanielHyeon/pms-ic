"""
Tracing Module - OpenTelemetry-compatible tracing

Provides distributed tracing capabilities for workflows:
- Trace context propagation
- Span creation and management
- Attribute and event recording
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from contextlib import contextmanager
from enum import Enum
import threading
import uuid
import logging
import json

logger = logging.getLogger(__name__)


class SpanStatus(Enum):
    """Span execution status."""
    UNSET = "unset"
    OK = "ok"
    ERROR = "error"


@dataclass
class SpanContext:
    """Context for span propagation."""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    trace_flags: int = 1  # 1 = sampled


@dataclass
class SpanEvent:
    """Event recorded within a span."""
    name: str
    timestamp: str
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Span:
    """
    A single trace span.

    Represents a unit of work with timing, attributes, and events.
    """
    name: str
    context: SpanContext
    start_time: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    end_time: Optional[str] = None
    status: SpanStatus = SpanStatus.UNSET
    status_message: Optional[str] = None
    attributes: Dict[str, Any] = field(default_factory=dict)
    events: List[SpanEvent] = field(default_factory=list)

    def set_attribute(self, key: str, value: Any) -> "Span":
        """Set a span attribute."""
        self.attributes[key] = value
        return self

    def set_attributes(self, attributes: Dict[str, Any]) -> "Span":
        """Set multiple attributes."""
        self.attributes.update(attributes)
        return self

    def add_event(self, name: str, attributes: Dict[str, Any] = None) -> "Span":
        """Add an event to the span."""
        self.events.append(SpanEvent(
            name=name,
            timestamp=datetime.utcnow().isoformat(),
            attributes=attributes or {},
        ))
        return self

    def set_status(self, status: str, message: str = None) -> "Span":
        """Set span status."""
        if status == "ok":
            self.status = SpanStatus.OK
        elif status == "error":
            self.status = SpanStatus.ERROR
        else:
            self.status = SpanStatus.UNSET
        self.status_message = message
        return self

    def end(self) -> "Span":
        """End the span."""
        self.end_time = datetime.utcnow().isoformat()
        return self

    def to_dict(self) -> Dict[str, Any]:
        """Convert span to dict for export."""
        return {
            "name": self.name,
            "trace_id": self.context.trace_id,
            "span_id": self.context.span_id,
            "parent_span_id": self.context.parent_span_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "status": self.status.value,
            "status_message": self.status_message,
            "attributes": self.attributes,
            "events": [
                {
                    "name": e.name,
                    "timestamp": e.timestamp,
                    "attributes": e.attributes,
                }
                for e in self.events
            ],
        }


class Tracer:
    """
    Tracer for creating and managing spans.

    Thread-safe implementation with context propagation.
    """

    def __init__(self, service_name: str = "llm-service"):
        """
        Initialize tracer.

        Args:
            service_name: Name of the service for span metadata
        """
        self.service_name = service_name
        self._local = threading.local()
        self._spans: List[Span] = []
        self._lock = threading.Lock()
        self._exporters: List[callable] = []

    def _get_current_span(self) -> Optional[Span]:
        """Get current span from thread-local storage."""
        return getattr(self._local, 'current_span', None)

    def _set_current_span(self, span: Optional[Span]):
        """Set current span in thread-local storage."""
        self._local.current_span = span

    def current_span(self) -> Optional[Span]:
        """Get the current active span."""
        return self._get_current_span()

    def start_span(
        self,
        name: str,
        parent: Optional[SpanContext] = None,
        attributes: Dict[str, Any] = None,
    ) -> Span:
        """
        Start a new span.

        Args:
            name: Span name
            parent: Optional parent span context
            attributes: Initial attributes

        Returns:
            New Span instance
        """
        # Get parent context
        if parent is None:
            current = self._get_current_span()
            if current:
                parent = current.context

        # Create span context
        trace_id = parent.trace_id if parent else str(uuid.uuid4())
        span_id = str(uuid.uuid4())[:16]
        parent_span_id = parent.span_id if parent else None

        context = SpanContext(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
        )

        # Create span
        span = Span(
            name=name,
            context=context,
            attributes=attributes or {},
        )

        # Add service name
        span.set_attribute("service.name", self.service_name)

        return span

    @contextmanager
    def trace(
        self,
        name: str,
        attributes: Dict[str, Any] = None,
    ):
        """
        Context manager for tracing.

        Usage:
            with tracer.trace("operation") as span:
                span.set_attribute("key", "value")
                # ... operation ...

        Args:
            name: Span name
            attributes: Initial attributes

        Yields:
            Active span
        """
        # Save previous span
        previous = self._get_current_span()

        # Start new span
        span = self.start_span(name, attributes=attributes)
        self._set_current_span(span)

        try:
            yield span
            if span.status == SpanStatus.UNSET:
                span.set_status("ok")
        except Exception as e:
            span.set_status("error", str(e))
            span.add_event("exception", {"message": str(e)})
            raise
        finally:
            span.end()
            self._record_span(span)
            self._set_current_span(previous)

    def _record_span(self, span: Span):
        """Record completed span."""
        with self._lock:
            self._spans.append(span)

            # Keep only last 1000 spans
            if len(self._spans) > 1000:
                self._spans = self._spans[-1000:]

        # Export to registered exporters
        for exporter in self._exporters:
            try:
                exporter(span)
            except Exception as e:
                logger.error(f"Span export error: {e}")

    def add_exporter(self, exporter: callable):
        """
        Add a span exporter.

        Args:
            exporter: Callable that receives Span objects
        """
        self._exporters.append(exporter)

    def get_trace(self, trace_id: str) -> List[Span]:
        """
        Get all spans for a trace.

        Args:
            trace_id: Trace ID

        Returns:
            List of spans in trace
        """
        with self._lock:
            return [s for s in self._spans if s.context.trace_id == trace_id]

    def get_recent_spans(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent spans.

        Args:
            limit: Maximum spans to return

        Returns:
            List of span dicts
        """
        with self._lock:
            return [s.to_dict() for s in self._spans[-limit:]]


# Default console exporter
def _console_exporter(span: Span):
    """Export span to console (for debugging)."""
    logger.debug(f"SPAN: {span.name} [{span.context.span_id}] "
                 f"status={span.status.value} "
                 f"attrs={json.dumps(span.attributes)}")


# Global tracer instance
_global_tracer: Optional[Tracer] = None


def get_tracer(service_name: str = "llm-service") -> Tracer:
    """
    Get the global tracer instance.

    Args:
        service_name: Service name for spans

    Returns:
        Global Tracer instance
    """
    global _global_tracer
    if _global_tracer is None:
        _global_tracer = Tracer(service_name)
        # Add console exporter for debugging
        # _global_tracer.add_exporter(_console_exporter)
    return _global_tracer


# Convenience alias
tracer = get_tracer()
