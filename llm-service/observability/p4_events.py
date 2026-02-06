"""
P4 Event Schema and Emitter - Observability Layer for AI Assistant.

PURPOSE:
- Track AI decision flow (why this response was given)
- Monitor data provenance (where data came from)
- Record recovery timeline (how failures were recovered)
- Enable regression analysis (compare across releases)

DESIGN PRINCIPLES:
1. trace_id connects all events for a single query
2. Events are tiered: trace (always) -> provenance (sampled) -> debug (failure only)
3. PII masking applied before storage
4. Non-blocking emission (best effort)

Reference: docs/P4_OBSERVABILITY_DASHBOARD.md
"""

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Callable
from enum import Enum
from datetime import datetime
from contextvars import ContextVar
import uuid
import re
import json
import logging

logger = logging.getLogger("p4_observability")


# =============================================================================
# Event Types
# =============================================================================

class EventType(str, Enum):
    """P4 event types by phase."""
    # P0: Intent Routing
    QUERY_RECEIVED = "query_received"
    INTENT_CLASSIFIED = "intent_classified"

    # P0.5: Query Normalization
    QUERY_NORMALIZED = "query_normalized"
    SHADOW_DICT_EVALUATED = "shadow_dict_evaluated"

    # P1: Data Query
    HANDLER_SELECTED = "handler_selected"
    DATA_QUERY_EXECUTED = "data_query_executed"
    DATA_EMPTY_DETECTED = "data_empty_detected"

    # P2: Quality
    QUALITY_CHECK_PASSED = "quality_check_passed"
    QUALITY_CHECK_FAILED = "quality_check_failed"

    # P3: Self-Healing
    RECOVERY_PLAN_CREATED = "recovery_plan_created"
    FALLBACK_ACTIVATED = "fallback_activated"
    AUTO_RECOVERY_EXECUTED = "auto_recovery_executed"

    # P3.5: Clarification
    CLARIFICATION_TRIGGERED = "clarification_triggered"
    CLARIFICATION_RESOLVED = "clarification_resolved"
    CLARIFICATION_ABANDONED = "clarification_abandoned"

    # Final
    RESPONSE_GENERATED = "response_generated"
    RESPONSE_RENDERED = "response_rendered"


class FinalStatus(str, Enum):
    """Final response status."""
    SUCCESS = "success"                    # Normal path success
    RECOVERED_SUCCESS = "recovered_success" # Success after recovery
    RECOVERED_GUIDANCE = "recovered_guidance" # Guidance provided (no data)
    FAILED = "failed"                      # Failed (user re-query needed)


class EventTier(str, Enum):
    """Event tier for storage/sampling."""
    TRACE = "trace"           # Always stored (required)
    PROVENANCE = "provenance" # Sampled (100% on failure, 10% on success)
    DEBUG = "debug"           # On-demand (failure investigation only)


# =============================================================================
# PII Masking
# =============================================================================

class PIIMasker:
    """PII masking processor."""

    PATTERNS = {
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "phone_kr": r"01[0-9]-?\d{3,4}-?\d{4}",
        "ssn_kr": r"\d{6}-?[1-4]\d{6}",
        "card": r"\d{4}-?\d{4}-?\d{4}-?\d{4}",
        "account": r"\d{3,4}-?\d{2,6}-?\d{2,6}",
    }

    DENYLIST_KEYS = {
        "password", "passwd", "pwd", "secret",
        "token", "api_key", "apikey", "auth",
        "credential", "private_key", "access_token",
        "refresh_token",
    }

    @classmethod
    def mask_query(cls, query: str) -> str:
        """Mask PII in query text."""
        result = query
        for name, pattern in cls.PATTERNS.items():
            result = re.sub(pattern, f"[{name.upper()}_MASKED]", result)
        return result

    @classmethod
    def sanitize_payload(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive keys from payload."""
        return {
            k: v for k, v in payload.items()
            if k.lower() not in cls.DENYLIST_KEYS
        }

    @classmethod
    def hash_user_id(cls, user_id: str, salt: str = "") -> str:
        """Hash user_id for privacy."""
        import hashlib
        return hashlib.sha256(f"{user_id}{salt}".encode()).hexdigest()[:16]


# =============================================================================
# Runtime Metadata
# =============================================================================

@dataclass
class RuntimeMetadata:
    """
    Release/deployment metadata - essential for regression analysis.

    Without this info, we cannot automatically prove "degraded in v2.4.0".
    """
    build_version: str = ""                # e.g., "v2.4.0"
    git_sha: str = ""                      # e.g., "abc1234"
    model_id: str = ""                     # LLM model identifier
    prompt_version: str = ""               # Prompt version
    policy_version: str = ""               # Policy version
    env: str = ""                          # "dev" | "stage" | "prod"
    feature_flags: str = ""                # Active feature flags

    def to_dict(self) -> Dict[str, Any]:
        return {
            "build_version": self.build_version,
            "git_sha": self.git_sha,
            "model_id": self.model_id,
            "prompt_version": self.prompt_version,
            "policy_version": self.policy_version,
            "env": self.env,
            "feature_flags": self.feature_flags,
        }


# Default runtime (can be set at startup)
_default_runtime = RuntimeMetadata()


def set_default_runtime(runtime: RuntimeMetadata) -> None:
    """Set default runtime metadata for all events."""
    global _default_runtime
    _default_runtime = runtime


def get_default_runtime() -> RuntimeMetadata:
    """Get default runtime metadata."""
    return _default_runtime


# =============================================================================
# P4 Event
# =============================================================================

@dataclass
class P4Event:
    """
    P4 observability event base structure.

    All events follow this structure.
    """
    # Identity
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str = ""                     # Connects all events for a query
    parent_event_id: Optional[str] = None  # Parent event ID for span-like structure
    session_id: str = ""                   # Session ID
    user_id: str = ""                      # User ID (hashed recommended)
    project_id: str = ""                   # Project ID

    # Event
    event_type: str = ""                   # EventType value
    timestamp: datetime = field(default_factory=datetime.utcnow)
    duration_ms: Optional[int] = None      # Event duration

    # Payload
    payload: Dict[str, Any] = field(default_factory=dict)

    # Context
    phase: str = ""                        # P0, P1, P2, P3, P3.5
    step_name: str = ""                    # "intent", "db_query", "fallback" etc.
    outcome: str = ""                      # "ok" | "empty" | "blocked" | "error"

    # Runtime Metadata (essential for regression analysis)
    runtime: RuntimeMetadata = field(default_factory=get_default_runtime)

    # Event tier
    tier: str = EventTier.TRACE.value

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "trace_id": self.trace_id,
            "parent_event_id": self.parent_event_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "project_id": self.project_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "duration_ms": self.duration_ms,
            "payload": self.payload,
            "phase": self.phase,
            "step_name": self.step_name,
            "outcome": self.outcome,
            "runtime": self.runtime.to_dict(),
            "tier": self.tier,
        }


# =============================================================================
# Event Payloads
# =============================================================================

@dataclass
class IntentClassifiedPayload:
    """INTENT_CLASSIFIED event payload."""
    query: str                             # Original query (masked)
    intent: str                            # Classified intent
    confidence: float                      # Confidence (0.0~1.0)
    threshold: float                       # Applied threshold
    basis: str                             # "keyword_match" | "model_inference" | "rule"
    matched_patterns: List[str] = field(default_factory=list)
    runner_up_intent: Optional[str] = None
    runner_up_confidence: Optional[float] = None
    decision_reason: Optional[str] = None


@dataclass
class DataQueryExecutedPayload:
    """DATA_QUERY_EXECUTED event payload."""
    query_type: str                        # "sql" | "nosql" | "api"
    query_name: str                        # Query identifier (no SQL exposure)
    row_count: int                         # Result row count
    is_empty: bool                         # Whether result is empty
    cache_hit: bool = False                # Cache hit
    duration_ms: int = 0
    query_class: str = ""                  # "metric" | "list" | "scope_probe"
    entity: Optional[str] = None           # "user_story" | "sprint" | "project"


@dataclass
class DataEmptyDetectedPayload:
    """DATA_EMPTY_DETECTED event payload."""
    intent: str
    reason: str                            # "no_data" | "no_scope" | "permission_denied"
    scope: Dict[str, Any] = field(default_factory=dict)
    suggestion: str = ""


@dataclass
class RecoveryPlanCreatedPayload:
    """RECOVERY_PLAN_CREATED event payload."""
    intent: str
    reason: str                            # RecoveryReason value
    actions: List[str] = field(default_factory=list)
    auto_executable: bool = False


@dataclass
class FallbackActivatedPayload:
    """FALLBACK_ACTIVATED event payload."""
    intent: str
    action_type: str                       # "auto_scope" | "fallback_query"
    original_scope: Dict[str, Any] = field(default_factory=dict)
    fallback_scope: Dict[str, Any] = field(default_factory=dict)
    success: bool = False


@dataclass
class ClarificationTriggeredPayload:
    """CLARIFICATION_TRIGGERED event payload."""
    intent: str
    question_id: str
    trigger_type: str                      # "empty" | "missing_scope" | "ambiguous"
    options_count: int = 0
    default_option: str = ""


@dataclass
class ClarificationResolvedPayload:
    """CLARIFICATION_RESOLVED event payload."""
    question_id: str
    resolution_type: str                   # "matched_numeric" | "matched_alias"
    selected_option: str
    turns_to_resolve: int = 1
    recovery_success: bool = False


@dataclass
class ClarificationAbandonedPayload:
    """CLARIFICATION_ABANDONED event payload."""
    question_id: str
    reason: str                            # "ttl_expired" | "topic_change"
    pending_duration_ms: int = 0
    ttl_limit_ms: int = 180000
    topic_changed: bool = False


@dataclass
class QueryNormalizedPayload:
    """QUERY_NORMALIZED event payload."""
    original_query: str                    # PIIMasker.mask_query() applied
    normalized_query: str                  # PIIMasker.mask_query() applied
    q_fingerprint: str                     # sha256(original)[:32] for cache tracing
    layers_applied: List[str] = field(default_factory=list)   # ["L2"], ["L2","L3"], etc.
    cache_hit: bool = False                # normalization cache hit
    negative_cache_hit: bool = False       # negative cache hit
    l3_called: bool = False                # L3 actually invoked
    l3_success: bool = False               # L3 led to non-UNKNOWN
    original_intent: str = ""              # intent before normalization
    final_intent: str = ""                 # intent after normalization
    duration_ms: int = 0                   # total normalization time
    normalizer_version: str = ""
    typo_dict_version: str = ""
    threshold_version: str = ""


@dataclass
class ShadowDictEvaluatedPayload:
    """SHADOW_DICT_EVALUATED event payload."""
    q_fingerprint: str
    shadow_corrected: str                  # masked
    production_intent: str
    shadow_intent: str
    would_change_routing: bool = False


@dataclass
class ResponseGeneratedPayload:
    """RESPONSE_GENERATED event payload."""
    intent: str
    final_status: str                      # FinalStatus value
    has_data: bool = False
    has_clarification: bool = False
    provenance_breakdown: Dict[str, float] = field(default_factory=dict)
    total_duration_ms: int = 0
    guidance_type: Optional[str] = None
    guidance_template_id: Optional[str] = None


# Payload class mapping
PAYLOAD_CLASSES = {
    EventType.QUERY_NORMALIZED.value: QueryNormalizedPayload,
    EventType.SHADOW_DICT_EVALUATED.value: ShadowDictEvaluatedPayload,
    EventType.INTENT_CLASSIFIED.value: IntentClassifiedPayload,
    EventType.DATA_QUERY_EXECUTED.value: DataQueryExecutedPayload,
    EventType.DATA_EMPTY_DETECTED.value: DataEmptyDetectedPayload,
    EventType.RECOVERY_PLAN_CREATED.value: RecoveryPlanCreatedPayload,
    EventType.FALLBACK_ACTIVATED.value: FallbackActivatedPayload,
    EventType.CLARIFICATION_TRIGGERED.value: ClarificationTriggeredPayload,
    EventType.CLARIFICATION_RESOLVED.value: ClarificationResolvedPayload,
    EventType.CLARIFICATION_ABANDONED.value: ClarificationAbandonedPayload,
    EventType.RESPONSE_GENERATED.value: ResponseGeneratedPayload,
}


def create_payload(event_type: str, **kwargs) -> Dict[str, Any]:
    """Create payload for event type."""
    payload_class = PAYLOAD_CLASSES.get(event_type)
    if payload_class:
        # Filter kwargs to only include fields in the dataclass
        valid_fields = {f.name for f in payload_class.__dataclass_fields__.values()}
        filtered_kwargs = {k: v for k, v in kwargs.items() if k in valid_fields}
        return asdict(payload_class(**filtered_kwargs))
    return kwargs


# =============================================================================
# Trace Context
# =============================================================================

# Context variable for trace_id (thread-safe)
_current_trace_id: ContextVar[str] = ContextVar("trace_id", default="")


def set_trace_id(trace_id: str) -> None:
    """Set current context trace_id."""
    _current_trace_id.set(trace_id)


def get_trace_id() -> str:
    """Get current context trace_id."""
    return _current_trace_id.get()


def generate_trace_id() -> str:
    """Generate a new trace_id."""
    return str(uuid.uuid4())


def require_trace_id(func: Callable) -> Callable:
    """Decorator that requires trace_id."""
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        trace_id = kwargs.get("trace_id") or get_trace_id()
        if not trace_id:
            raise ValueError(f"trace_id is required for {func.__name__}")
        return func(*args, **kwargs)
    return wrapper


class TraceContext:
    """
    Context manager for trace_id propagation in async tasks.

    Usage:
        async with TraceContext(trace_id) as ctx:
            await some_async_task()
    """
    def __init__(self, trace_id: str):
        self.trace_id = trace_id
        self._token = None

    def __enter__(self):
        self._token = _current_trace_id.set(self.trace_id)
        return self

    def __exit__(self, *args):
        if self._token:
            _current_trace_id.reset(self._token)

    async def __aenter__(self):
        return self.__enter__()

    async def __aexit__(self, *args):
        return self.__exit__(*args)


def extract_or_create_trace_id(headers: dict) -> str:
    """
    Extract trace_id from request headers or create new one.

    Standard headers: X-Trace-ID, X-Request-ID, traceparent (W3C)
    """
    trace_id = (
        headers.get("X-Trace-ID") or
        headers.get("X-Request-ID") or
        _parse_traceparent(headers.get("traceparent", ""))
    )
    return trace_id or generate_trace_id()


def _parse_traceparent(traceparent: str) -> Optional[str]:
    """Extract trace-id from W3C traceparent header."""
    if not traceparent:
        return None
    parts = traceparent.split("-")
    if len(parts) >= 2:
        return parts[1]
    return None


# =============================================================================
# Event Backends
# =============================================================================

class EventBackend:
    """Base class for event backends."""

    def write(self, event: P4Event) -> None:
        """Write event to backend."""
        raise NotImplementedError


class ConsoleBackend(EventBackend):
    """Development console backend."""

    def write(self, event: P4Event) -> None:
        print(f"[P4] {event.event_type}: {json.dumps(event.payload, ensure_ascii=False)}")


class FileBackend(EventBackend):
    """File backend for local storage."""

    def __init__(self, filepath: str):
        self.filepath = filepath

    def write(self, event: P4Event) -> None:
        with open(self.filepath, "a") as f:
            f.write(json.dumps(event.to_dict(), ensure_ascii=False) + "\n")


class MemoryBackend(EventBackend):
    """In-memory backend for testing."""

    def __init__(self):
        self.events: List[P4Event] = []

    def write(self, event: P4Event) -> None:
        self.events.append(event)

    def get_events(self) -> List[P4Event]:
        return self.events

    def get_events_by_trace(self, trace_id: str) -> List[P4Event]:
        return [e for e in self.events if e.trace_id == trace_id]

    def get_events_by_type(self, event_type: str) -> List[P4Event]:
        return [e for e in self.events if e.event_type == event_type]

    def clear(self) -> None:
        self.events = []


# =============================================================================
# Event Emitter
# =============================================================================

class P4EventEmitter:
    """
    P4 event emitter.

    Supports multiple backends:
    - Console (development)
    - File (local)
    - PostgreSQL (production)
    - OpenTelemetry (distributed tracing)
    """

    def __init__(self):
        self.backends: List[EventBackend] = []
        self._enabled = True

    def add_backend(self, backend: EventBackend) -> None:
        """Add a backend."""
        self.backends.append(backend)

    def remove_backend(self, backend: EventBackend) -> None:
        """Remove a backend."""
        if backend in self.backends:
            self.backends.remove(backend)

    def enable(self) -> None:
        """Enable event emission."""
        self._enabled = True

    def disable(self) -> None:
        """Disable event emission."""
        self._enabled = False

    def emit(
        self,
        event_type: str,
        payload: Dict[str, Any],
        trace_id: Optional[str] = None,
        session_id: str = "",
        user_id: str = "",
        project_id: str = "",
        phase: str = "",
        step_name: str = "",
        outcome: str = "",
        duration_ms: Optional[int] = None,
        tier: str = EventTier.TRACE.value,
    ) -> Optional[P4Event]:
        """Emit an event."""
        if not self._enabled:
            return None

        # Sanitize payload
        sanitized_payload = PIIMasker.sanitize_payload(payload)

        event = P4Event(
            trace_id=trace_id or get_trace_id(),
            session_id=session_id,
            user_id=user_id,
            project_id=project_id,
            event_type=event_type,
            payload=sanitized_payload,
            phase=phase,
            step_name=step_name,
            outcome=outcome,
            duration_ms=duration_ms,
            tier=tier,
        )

        for backend in self.backends:
            try:
                backend.write(event)
            except Exception as e:
                logger.error(f"Failed to write event to backend: {e}")

        return event


# Global emitter instance
_emitter = P4EventEmitter()


def get_emitter() -> P4EventEmitter:
    """Get the global emitter instance."""
    return _emitter


def init_emitter(backends: List[EventBackend]) -> None:
    """Initialize emitter with backends."""
    for backend in backends:
        _emitter.add_backend(backend)


def emit_event(
    event_type: str,
    trace_id: Optional[str] = None,
    phase: str = "",
    step_name: str = "",
    outcome: str = "",
    duration_ms: Optional[int] = None,
    tier: str = EventTier.TRACE.value,
    **payload_kwargs,
) -> Optional[P4Event]:
    """
    Emit an event (convenience function).

    Usage:
        emit_event(
            EventType.INTENT_CLASSIFIED,
            query="show backlog",
            intent="BACKLOG_LIST",
            confidence=0.92,
        )
    """
    payload = create_payload(event_type, **payload_kwargs)
    return _emitter.emit(
        event_type=event_type,
        payload=payload,
        trace_id=trace_id,
        phase=phase,
        step_name=step_name,
        outcome=outcome,
        duration_ms=duration_ms,
        tier=tier,
    )


# =============================================================================
# Sampling Policy
# =============================================================================

class SamplingPolicy:
    """
    Sampling policy for event tiers.

    | Case | Trace | Provenance | Debug |
    |------|-------|------------|-------|
    | success | 100% | 10% | 0% |
    | recovered_success | 100% | 100% | 10% |
    | recovered_guidance | 100% | 100% | 50% |
    | failed | 100% | 100% | 100% |
    """

    RATES = {
        FinalStatus.SUCCESS.value: {
            EventTier.TRACE.value: 1.0,
            EventTier.PROVENANCE.value: 0.1,
            EventTier.DEBUG.value: 0.0,
        },
        FinalStatus.RECOVERED_SUCCESS.value: {
            EventTier.TRACE.value: 1.0,
            EventTier.PROVENANCE.value: 1.0,
            EventTier.DEBUG.value: 0.1,
        },
        FinalStatus.RECOVERED_GUIDANCE.value: {
            EventTier.TRACE.value: 1.0,
            EventTier.PROVENANCE.value: 1.0,
            EventTier.DEBUG.value: 0.5,
        },
        FinalStatus.FAILED.value: {
            EventTier.TRACE.value: 1.0,
            EventTier.PROVENANCE.value: 1.0,
            EventTier.DEBUG.value: 1.0,
        },
    }

    @classmethod
    def should_sample(
        cls,
        tier: str,
        final_status: str,
    ) -> bool:
        """Check if event should be sampled based on tier and status."""
        import random

        rates = cls.RATES.get(final_status, cls.RATES[FinalStatus.SUCCESS.value])
        rate = rates.get(tier, 1.0)
        return random.random() < rate

    @classmethod
    def get_rate(cls, tier: str, final_status: str) -> float:
        """Get sampling rate for tier and status."""
        rates = cls.RATES.get(final_status, cls.RATES[FinalStatus.SUCCESS.value])
        return rates.get(tier, 1.0)
