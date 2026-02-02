"""
BMAD Contracts Package

TypedDict definitions and validation schemas for BMAD workflow.
"""

from contracts.state import (
    # Enums
    RequestType,
    Track,
    GuardianVerdict,
    RiskLevel,
    # TypedDict structures
    EvidenceItem,
    AnalystPlan,
    ArchitectSpec,
    GuardianReport,
    ChatState,
    # Policy tables
    TRACK_POLICY,
    REQUIRED_SOURCES_BY_TYPE,
    FORBIDDEN_SOURCES_BY_TYPE,
    # Helper functions
    get_track_policy,
    get_required_sources,
    get_forbidden_sources,
    is_source_allowed,
    create_initial_state,
)

from contracts.schemas import (
    # JSON Schemas
    ANALYST_OUTPUT_SCHEMA,
    ARCHITECT_OUTPUT_SCHEMA,
    GUARDIAN_OUTPUT_SCHEMA,
    EVIDENCE_ITEM_SCHEMA,
    ROLE_RULES,
    # Validation functions
    validate_json_schema,
    validate_role_constraints,
    validate_role_output,
)

from contracts.section_templates import (
    # Templates
    SECTION_TEMPLATES,
    DOMAIN_TERMS,
    DEFAULT_TEMPLATE,
    DEFAULT_DOMAIN_TERMS,
    # Helper functions
    get_section_template,
    get_domain_terms,
    get_response_format,
    get_required_sections,
    get_forbidden_content,
    build_spec_from_template,
)

__all__ = [
    # Enums
    "RequestType",
    "Track",
    "GuardianVerdict",
    "RiskLevel",
    # TypedDict structures
    "EvidenceItem",
    "AnalystPlan",
    "ArchitectSpec",
    "GuardianReport",
    "ChatState",
    # Policy tables
    "TRACK_POLICY",
    "REQUIRED_SOURCES_BY_TYPE",
    "FORBIDDEN_SOURCES_BY_TYPE",
    # Helper functions
    "get_track_policy",
    "get_required_sources",
    "get_forbidden_sources",
    "is_source_allowed",
    "create_initial_state",
    # JSON Schemas
    "ANALYST_OUTPUT_SCHEMA",
    "ARCHITECT_OUTPUT_SCHEMA",
    "GUARDIAN_OUTPUT_SCHEMA",
    "EVIDENCE_ITEM_SCHEMA",
    "ROLE_RULES",
    # Validation functions
    "validate_json_schema",
    "validate_role_constraints",
    "validate_role_output",
    # Section Templates (Phase 4)
    "SECTION_TEMPLATES",
    "DOMAIN_TERMS",
    "DEFAULT_TEMPLATE",
    "DEFAULT_DOMAIN_TERMS",
    "get_section_template",
    "get_domain_terms",
    "get_response_format",
    "get_required_sections",
    "get_forbidden_content",
    "build_spec_from_template",
]
