"""
BMAD Nodes Package

LangGraph nodes for BMAD workflow.

Phase 2: Guardian System nodes
Phase 3: Analyst Plan nodes
Phase 4: Architect Spec nodes
Phase 5: FAST Track Light Guardian
Phase 6: Timing wrapper for observability
"""

from nodes.guardian_verify import (
    guardian_verify,
    decide_verdict,
    get_guardian_summary,
    should_retry,
    should_pass,
    should_fail,
    MAX_RETRY,
    VERDICT_PASS,
    VERDICT_RETRY,
    VERDICT_FAIL,
    RISK_HIGH,
    RISK_MED,
    RISK_LOW,
)

from nodes.retry_bump import (
    bump_retry,
    reset_retry,
    get_retry_count,
    can_retry,
)

from nodes.analyst_plan import (
    analyst_plan,
    REQUEST_TYPES,
    TRACKS,
    VALID_SOURCES,
    REQUIRED_SOURCES_BY_TYPE,
    FORBIDDEN_SOURCES_BY_TYPE,
    ANALYST_PROMPT,
    resolve_source_conflicts,
    get_required_sources,
    get_forbidden_sources,
    is_source_allowed,
    enforce_question_limits,
    has_clarification_questions,
    get_clarification_questions,
    get_sources_from_plan,
    get_expected_schema,
    should_skip_retrieval,
)

from nodes.architect_outline import (
    architect_outline,
    RESPONSE_FORMATS,
    MIN_SECTIONS,
    MAX_SECTIONS,
    ARCHITECT_PROMPT,
    merge_with_template,
    enforce_section_limits,
    validate_spec_for_request_type,
    get_spec_from_state,
    get_response_format_from_spec,
    get_sections_from_spec,
    get_forbidden_from_spec,
    get_domain_terms_from_spec,
    should_use_json_format,
)

# Phase 5: FAST Track Light Guardian
from nodes.light_policy_gate import (
    light_policy_gate,
    check_banned_keywords,
    check_sensitive_topics,
    is_policy_blocked,
    is_upgrade_required,
    get_policy_reason,
    BANNED_KEYWORDS,
    SENSITIVE_TOPICS,
)

from nodes.light_guardian import (
    light_guardian,
    light_guardian_with_sampling,
    should_apply_light_guardian,
    set_sampling_rate,
    get_sampling_rate,
    check_sensitive_leak,
    check_definitive_claims,
    get_verdict,
    get_risk_level,
    is_high_risk,
    SAMPLING_RATE,
    MIN_RESPONSE_LENGTH,
    SENSITIVE_PATTERNS,
    DEFINITIVE_PHRASES,
)

from nodes.fast_track import (
    fast_guard_decision,
    apply_safe_exit,
    should_upgrade_to_quality,
    is_safe_exit,
    generate_fast_answer,
    get_fast_prompt,
    run_fast_pipeline,
    is_fast_track,
    mark_for_quality_upgrade,
    UPGRADE_REQUEST_TYPES,
    SAFE_EXIT_MESSAGE,
    FAST_PROMPT,
)

# Phase 6: Timing wrapper for observability
from nodes.timing import (
    time_node,
    emit_timing_metric,
    timed,
    init_trace,
    get_trace_id,
    get_timings,
    get_total_time,
    get_node_time,
    get_slowest_node,
    format_timings,
    wrap_request,
    finalize_request,
)

__all__ = [
    # Guardian verify node
    "guardian_verify",
    "decide_verdict",
    "get_guardian_summary",
    "should_retry",
    "should_pass",
    "should_fail",
    # Constants
    "MAX_RETRY",
    "VERDICT_PASS",
    "VERDICT_RETRY",
    "VERDICT_FAIL",
    "RISK_HIGH",
    "RISK_MED",
    "RISK_LOW",
    # Retry bump node
    "bump_retry",
    "reset_retry",
    "get_retry_count",
    "can_retry",
    # Analyst Plan node (Phase 3)
    "analyst_plan",
    "REQUEST_TYPES",
    "TRACKS",
    "VALID_SOURCES",
    "REQUIRED_SOURCES_BY_TYPE",
    "FORBIDDEN_SOURCES_BY_TYPE",
    "ANALYST_PROMPT",
    "resolve_source_conflicts",
    "get_required_sources",
    "get_forbidden_sources",
    "is_source_allowed",
    "enforce_question_limits",
    "has_clarification_questions",
    "get_clarification_questions",
    "get_sources_from_plan",
    "get_expected_schema",
    "should_skip_retrieval",
    # Architect Outline node (Phase 4)
    "architect_outline",
    "RESPONSE_FORMATS",
    "MIN_SECTIONS",
    "MAX_SECTIONS",
    "ARCHITECT_PROMPT",
    "merge_with_template",
    "enforce_section_limits",
    "validate_spec_for_request_type",
    "get_spec_from_state",
    "get_response_format_from_spec",
    "get_sections_from_spec",
    "get_forbidden_from_spec",
    "get_domain_terms_from_spec",
    "should_use_json_format",
    # Light Policy Gate (Phase 5)
    "light_policy_gate",
    "check_banned_keywords",
    "check_sensitive_topics",
    "is_policy_blocked",
    "is_upgrade_required",
    "get_policy_reason",
    "BANNED_KEYWORDS",
    "SENSITIVE_TOPICS",
    # Light Guardian (Phase 5)
    "light_guardian",
    "light_guardian_with_sampling",
    "should_apply_light_guardian",
    "set_sampling_rate",
    "get_sampling_rate",
    "check_sensitive_leak",
    "check_definitive_claims",
    "get_verdict",
    "get_risk_level",
    "is_high_risk",
    "SAMPLING_RATE",
    "MIN_RESPONSE_LENGTH",
    "SENSITIVE_PATTERNS",
    "DEFINITIVE_PHRASES",
    # FAST Track (Phase 5)
    "fast_guard_decision",
    "apply_safe_exit",
    "should_upgrade_to_quality",
    "is_safe_exit",
    "generate_fast_answer",
    "get_fast_prompt",
    "run_fast_pipeline",
    "is_fast_track",
    "mark_for_quality_upgrade",
    "UPGRADE_REQUEST_TYPES",
    "SAFE_EXIT_MESSAGE",
    "FAST_PROMPT",
    # Timing (Phase 6)
    "time_node",
    "emit_timing_metric",
    "timed",
    "init_trace",
    "get_trace_id",
    "get_timings",
    "get_total_time",
    "get_node_time",
    "get_slowest_node",
    "format_timings",
    "wrap_request",
    "finalize_request",
]
