"""
BMAD Guards Package

Output validation and JSON parsing utilities for BMAD workflow.

Phase 1: JSON parsing and output guards
Phase 2: Evidence, contract, and policy checks
Phase 4: Enhanced contract checks
"""

from guards.json_parse import (
    extract_first_json,
    extract_json_array,
    try_extract_json,
    validate_json_structure,
    safe_json_dumps,
)

from guards.output_guard import (
    OutputGuard,
    create_analyst_guard,
    create_architect_guard,
    create_guardian_guard,
    validate_analyst_output,
    validate_architect_output,
    validate_guardian_output,
    get_analyst_fallback,
    get_architect_fallback,
    get_guardian_fallback,
)

# Phase 2: Guardian System checks
from guards.evidence_check import (
    check_evidence,
    get_evidence_sources,
    calculate_average_confidence,
    has_required_source,
    has_forbidden_source,
    EVIDENCE_ACTIONS,
)

from guards.contract_check import (
    # Main functions
    check_contract,
    full_contract_check,
    # Helper functions
    check_required_sections,
    check_forbidden_content,
    check_domain_terms_usage,
    validate_response_format,
    # Phase 4 functions
    check_status_evidence,
    check_evidence_density,
    check_section_depth,
    check_hallucination_patterns,
    # Constants
    CONTRACT_ACTIONS,
)

from guards.policy_check import (
    check_policy,
    check_query_policy,
    check_response_policy,
    check_permissions,
    has_sensitive_data,
    redact_sensitive_patterns,
    POLICY_ACTIONS,
)

__all__ = [
    # JSON parsing
    "extract_first_json",
    "extract_json_array",
    "try_extract_json",
    "validate_json_structure",
    "safe_json_dumps",
    # Output guards
    "OutputGuard",
    "create_analyst_guard",
    "create_architect_guard",
    "create_guardian_guard",
    "validate_analyst_output",
    "validate_architect_output",
    "validate_guardian_output",
    # Fallbacks
    "get_analyst_fallback",
    "get_architect_fallback",
    "get_guardian_fallback",
    # Evidence check (Phase 2)
    "check_evidence",
    "get_evidence_sources",
    "calculate_average_confidence",
    "has_required_source",
    "has_forbidden_source",
    "EVIDENCE_ACTIONS",
    # Contract check (Phase 2 & 4)
    "check_contract",
    "full_contract_check",
    "check_required_sections",
    "check_forbidden_content",
    "check_domain_terms_usage",
    "validate_response_format",
    "check_status_evidence",
    "check_evidence_density",
    "check_section_depth",
    "check_hallucination_patterns",
    "CONTRACT_ACTIONS",
    # Policy check (Phase 2)
    "check_policy",
    "check_query_policy",
    "check_response_policy",
    "check_permissions",
    "has_sensitive_data",
    "redact_sensitive_patterns",
    "POLICY_ACTIONS",
]
