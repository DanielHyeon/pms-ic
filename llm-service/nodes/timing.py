"""
BMAD Node Timing - Phase 6: Observability

Timing wrapper for node execution.

Reference: docs/llm-improvement/06-observability-metrics.md
"""

from __future__ import annotations
from typing import Callable, Dict, Any, TypeVar, Optional
from functools import wraps
import time
import logging
import uuid

from observability.bmad_metrics import get_bmad_metrics

logger = logging.getLogger(__name__)

# Type for state
State = Dict[str, Any]
NodeFn = Callable[[State], State]


# =============================================================================
# Timing Functions
# =============================================================================

def time_node(
    name: str,
    state: State,
    fn: NodeFn
) -> State:
    """
    Wrapper to time node execution.
    Stores timing in state and emits metric.

    Args:
        name: Node name
        state: ChatState dictionary
        fn: Node function to execute

    Returns:
        Updated state with timing
    """
    t0 = time.time()

    try:
        out = fn(state)
    except Exception as e:
        dt_ms = int((time.time() - t0) * 1000)
        logger.error(f"time_node {name}: Error after {dt_ms}ms - {e}")
        raise

    dt_ms = int((time.time() - t0) * 1000)

    # Store in state
    timings = out.get("timings_ms", {}) or {}
    timings[name] = dt_ms
    out["timings_ms"] = timings

    # Emit metric
    track = out.get("track", "unknown")
    emit_timing_metric(name, track, dt_ms)

    logger.debug(f"time_node {name}: {dt_ms}ms")

    return out


def emit_timing_metric(node: str, track: str, duration_ms: int) -> None:
    """
    Emit timing metric to observability backend.

    Args:
        node: Node name
        track: Track type
        duration_ms: Duration in milliseconds
    """
    try:
        metrics = get_bmad_metrics()
        metrics.emit_node_timing(node, track, duration_ms)
    except Exception as e:
        logger.warning(f"emit_timing_metric: Error - {e}")


# =============================================================================
# Timing Decorator
# =============================================================================

def timed(name: str = None) -> Callable[[NodeFn], NodeFn]:
    """
    Decorator to time node functions.

    Usage:
        @timed("analyst_plan")
        def analyst_plan(state):
            ...

    Args:
        name: Optional node name (defaults to function name)

    Returns:
        Decorated function
    """
    def decorator(fn: NodeFn) -> NodeFn:
        node_name = name or fn.__name__

        @wraps(fn)
        def wrapper(state: State) -> State:
            return time_node(node_name, state, fn)

        return wrapper

    return decorator


# =============================================================================
# Trace Initialization
# =============================================================================

def init_trace(state: State) -> State:
    """
    Initialize trace ID for request tracking.

    Args:
        state: ChatState dictionary

    Returns:
        Updated state with trace_id
    """
    if not state.get("trace_id"):
        state["trace_id"] = str(uuid.uuid4())[:8]
        logger.debug(f"init_trace: Created trace_id={state['trace_id']}")
    return state


def get_trace_id(state: State) -> str:
    """
    Get trace ID from state.

    Args:
        state: ChatState dictionary

    Returns:
        Trace ID or "no-trace"
    """
    return state.get("trace_id", "no-trace")


# =============================================================================
# Timings Helper Functions
# =============================================================================

def get_timings(state: State) -> Dict[str, int]:
    """
    Get all timings from state.

    Args:
        state: ChatState dictionary

    Returns:
        Dictionary of node -> duration_ms
    """
    return state.get("timings_ms", {}) or {}


def get_total_time(state: State) -> int:
    """
    Get total execution time.

    Args:
        state: ChatState dictionary

    Returns:
        Total time in milliseconds
    """
    timings = get_timings(state)
    return sum(timings.values())


def get_node_time(state: State, node: str) -> int:
    """
    Get specific node's execution time.

    Args:
        state: ChatState dictionary
        node: Node name

    Returns:
        Time in milliseconds or 0
    """
    timings = get_timings(state)
    return timings.get(node, 0)


def get_slowest_node(state: State) -> tuple[str, int]:
    """
    Get the slowest node.

    Args:
        state: ChatState dictionary

    Returns:
        Tuple of (node_name, duration_ms)
    """
    timings = get_timings(state)
    if not timings:
        return ("", 0)

    slowest = max(timings.items(), key=lambda x: x[1])
    return slowest


def format_timings(state: State) -> str:
    """
    Format timings for logging.

    Args:
        state: ChatState dictionary

    Returns:
        Formatted string
    """
    timings = get_timings(state)
    if not timings:
        return "no timings"

    parts = [f"{k}={v}ms" for k, v in timings.items()]
    total = get_total_time(state)
    return f"[{' | '.join(parts)} | total={total}ms]"


# =============================================================================
# Request Wrapper
# =============================================================================

def wrap_request(state: State) -> State:
    """
    Initialize request with trace and timing.

    Call at start of request handling.

    Args:
        state: ChatState dictionary

    Returns:
        Initialized state
    """
    state = init_trace(state)
    state["timings_ms"] = {}
    state["_request_start"] = time.time()
    return state


def finalize_request(state: State) -> State:
    """
    Finalize request and emit metrics.

    Call at end of request handling.

    Args:
        state: ChatState dictionary

    Returns:
        Finalized state
    """
    from observability.bmad_metrics import get_bmad_metrics
    from observability.state_store import store_completed_state

    # Calculate total time if not already done
    if state.get("_request_start"):
        total_ms = int((time.time() - state["_request_start"]) * 1000)
        timings = state.get("timings_ms", {}) or {}
        timings["_total"] = total_ms
        state["timings_ms"] = timings

    # Emit all metrics
    try:
        metrics = get_bmad_metrics()
        metrics.emit_request_complete(state)
    except Exception as e:
        logger.warning(f"finalize_request: Error emitting metrics - {e}")

    # Store state
    try:
        store_completed_state(state)
    except Exception as e:
        logger.warning(f"finalize_request: Error storing state - {e}")

    logger.info(f"finalize_request: {format_timings(state)}")

    return state


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Core timing
    "time_node",
    "emit_timing_metric",
    "timed",
    # Trace
    "init_trace",
    "get_trace_id",
    # Timings helpers
    "get_timings",
    "get_total_time",
    "get_node_time",
    "get_slowest_node",
    "format_timings",
    # Request wrappers
    "wrap_request",
    "finalize_request",
]
