"""
BMAD Phase 4 Tests - Architect Spec Enhancement

Tests for:
- Section Templates (contracts/section_templates.py)
- Architect Outline node (nodes/architect_outline.py)
- Enhanced Contract Check (guards/contract_check.py)

Reference: docs/llm-improvement/04-architect-spec.md
"""

import pytest
import json
from typing import Dict, Any, List, Optional


# =============================================================================
# Test Imports
# =============================================================================

from contracts.section_templates import (
    SECTION_TEMPLATES,
    DOMAIN_TERMS,
    DEFAULT_TEMPLATE,
    DEFAULT_DOMAIN_TERMS,
    get_section_template,
    get_domain_terms,
    get_response_format,
    get_required_sections,
    get_forbidden_content,
    build_spec_from_template,
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

from guards.contract_check import (
    check_contract,
    full_contract_check,
    check_required_sections,
    check_forbidden_content,
    check_domain_terms_usage,
    validate_response_format,
    check_status_evidence,
    check_evidence_density,
    check_section_depth,
    check_hallucination_patterns,
)

from guards.output_guard import validate_architect_output


# =============================================================================
# Mock LLM for Testing
# =============================================================================

class MockLLM:
    """Mock LLM for testing architect_outline node."""

    def __init__(self, response: str):
        self.response = response
        self.call_count = 0
        self.last_prompt = None

    def __call__(self, prompt: str) -> str:
        self.call_count += 1
        self.last_prompt = prompt
        return self.response


def make_valid_architect_response(
    response_format: str = "markdown",
    domain_terms: List[str] = None,
    forbidden_content: List[str] = None,
    required_sections: List[str] = None
) -> str:
    """Create a valid JSON response for mock LLM."""
    return json.dumps({
        "response_format": response_format,
        "domain_terms": domain_terms if domain_terms is not None else ["Sprint", "Backlog"],
        "forbidden_content": forbidden_content if forbidden_content is not None else ["inventing facts"],
        "required_sections": required_sections if required_sections is not None else ["Summary", "Evidence", "Answer"]
    })


# =============================================================================
# Test Section Templates
# =============================================================================

class TestSectionTemplates:
    """Tests for section_templates.py"""

    def test_all_request_types_have_templates(self):
        """All request types should have section templates."""
        request_types = [
            "STATUS_METRIC", "STATUS_SUMMARY", "STATUS_LIST",
            "DESIGN_ARCH", "HOWTO_POLICY", "DATA_DEFINITION",
            "TROUBLESHOOTING", "KNOWLEDGE_QA", "CASUAL"
        ]
        for rt in request_types:
            assert rt in SECTION_TEMPLATES, f"Missing template for {rt}"

    def test_all_request_types_have_domain_terms(self):
        """All request types should have domain terms."""
        for rt in SECTION_TEMPLATES.keys():
            assert rt in DOMAIN_TERMS, f"Missing domain terms for {rt}"
            assert len(DOMAIN_TERMS[rt]) > 0, f"Empty domain terms for {rt}"

    def test_status_metric_template(self):
        """STATUS_METRIC should have specific structure."""
        template = SECTION_TEMPLATES["STATUS_METRIC"]
        assert template["response_format"] in ["hybrid", "json"]
        assert "Current Value" in template["required_sections"]
        assert any("estimated" in f.lower() or "speculation" in f.lower()
                   for f in template["forbidden_content"])

    def test_design_arch_template(self):
        """DESIGN_ARCH should have architecture sections."""
        template = SECTION_TEMPLATES["DESIGN_ARCH"]
        assert template["response_format"] == "markdown"
        sections = template["required_sections"]
        assert any("arch" in s.lower() or "component" in s.lower()
                   for s in sections)

    def test_casual_template_minimal(self):
        """CASUAL should have minimal required sections."""
        template = SECTION_TEMPLATES["CASUAL"]
        assert len(template["required_sections"]) <= 2

    def test_get_section_template_returns_copy(self):
        """get_section_template should return a copy."""
        template1 = get_section_template("STATUS_METRIC")
        template2 = get_section_template("STATUS_METRIC")
        template1["response_format"] = "json"
        assert template2["response_format"] != "json"

    def test_get_section_template_unknown_type(self):
        """Unknown type should return default template."""
        template = get_section_template("UNKNOWN_TYPE")
        assert template == DEFAULT_TEMPLATE

    def test_get_domain_terms(self):
        """get_domain_terms should return terms for request type."""
        terms = get_domain_terms("STATUS_METRIC")
        assert "Sprint" in terms or "Velocity" in terms

    def test_build_spec_from_template(self):
        """build_spec_from_template should create complete spec."""
        spec = build_spec_from_template("DESIGN_ARCH")
        assert "response_format" in spec
        assert "domain_terms" in spec
        assert "forbidden_content" in spec
        assert "required_sections" in spec
        assert len(spec["domain_terms"]) > 0
        assert len(spec["forbidden_content"]) > 0

    def test_default_template_structure(self):
        """Default template should have all required fields."""
        assert "response_format" in DEFAULT_TEMPLATE
        assert "required_sections" in DEFAULT_TEMPLATE
        assert "forbidden_content" in DEFAULT_TEMPLATE


# =============================================================================
# Test Architect Outline Node
# =============================================================================

class TestArchitectOutline:
    """Tests for architect_outline node."""

    def test_architect_outline_with_valid_response(self):
        """Should parse valid LLM response."""
        mock_llm = MockLLM(make_valid_architect_response())
        state = {
            "user_query": "What's the sprint velocity?",
            "request_type": "STATUS_METRIC",
            "track": "QUALITY"
        }
        result = architect_outline(state, mock_llm)

        assert "architect_spec" in result
        spec = result["architect_spec"]
        assert spec["response_format"] == "markdown"
        assert len(spec["required_sections"]) >= 1

    def test_architect_outline_without_llm(self):
        """Should use template when no LLM provided."""
        state = {
            "user_query": "Design the auth module",
            "request_type": "DESIGN_ARCH",
            "track": "QUALITY"
        }
        result = architect_outline(state, llm_fn=None)

        assert "architect_spec" in result
        spec = result["architect_spec"]
        assert spec["response_format"] == "markdown"
        assert "architect_template" in result.get("route_reason", "")

    def test_architect_outline_parse_failure(self):
        """Should fallback on parse failure."""
        mock_llm = MockLLM("This is not JSON at all")
        state = {
            "user_query": "test query",
            "request_type": "KNOWLEDGE_QA",
            "track": "QUALITY"
        }
        result = architect_outline(state, mock_llm)

        assert "architect_spec" in result
        assert "architect_fallback" in result.get("route_reason", "")

    def test_architect_outline_llm_error(self):
        """Should fallback on LLM error."""
        def error_llm(prompt):
            raise Exception("LLM error")

        state = {
            "user_query": "test query",
            "request_type": "KNOWLEDGE_QA",
            "track": "QUALITY"
        }
        result = architect_outline(state, error_llm)

        assert "architect_spec" in result
        assert "llm_error" in result.get("route_reason", "")

    def test_architect_outline_validation_failure(self):
        """Should fallback on validation failure."""
        # Empty forbidden_content should fail validation
        mock_llm = MockLLM(json.dumps({
            "response_format": "markdown",
            "domain_terms": [],
            "forbidden_content": [],  # Will be merged, but let's test
            "required_sections": []   # Empty sections
        }))
        state = {
            "user_query": "test query",
            "request_type": "KNOWLEDGE_QA",
            "track": "QUALITY"
        }
        result = architect_outline(state, mock_llm)

        # Should have spec (either merged or fallback)
        assert "architect_spec" in result

    def test_prompt_includes_context(self):
        """Prompt should include user query, request type, and track."""
        mock_llm = MockLLM(make_valid_architect_response())
        state = {
            "user_query": "Design the BMAD system",
            "request_type": "DESIGN_ARCH",
            "track": "QUALITY"
        }
        architect_outline(state, mock_llm)

        assert "Design the BMAD system" in mock_llm.last_prompt
        assert "DESIGN_ARCH" in mock_llm.last_prompt
        assert "QUALITY" in mock_llm.last_prompt


# =============================================================================
# Test Merge and Validation Helpers
# =============================================================================

class TestMergeHelpers:
    """Tests for merge and validation helpers."""

    def test_merge_with_template_adds_missing_fields(self):
        """Should add missing fields from template."""
        spec = {"response_format": "json"}
        merged = merge_with_template(spec, "STATUS_METRIC")

        assert "domain_terms" in merged
        assert "forbidden_content" in merged
        assert "required_sections" in merged
        assert len(merged["domain_terms"]) > 0

    def test_merge_with_template_keeps_existing(self):
        """Should keep existing values."""
        spec = {
            "response_format": "json",
            "domain_terms": ["Custom", "Terms"],
            "forbidden_content": ["custom forbidden"],
            "required_sections": ["Custom Section"]
        }
        merged = merge_with_template(spec, "STATUS_METRIC")

        assert merged["response_format"] == "json"
        assert "Custom" in merged["domain_terms"]

    def test_merge_adds_standard_forbidden(self):
        """Should add standard forbidden content."""
        spec = {
            "response_format": "markdown",
            "forbidden_content": ["custom only"]
        }
        merged = merge_with_template(spec, "KNOWLEDGE_QA")

        # Should have standard forbidden content added
        forbidden_lower = [f.lower() for f in merged["forbidden_content"]]
        assert any("inventing" in f for f in forbidden_lower)

    def test_enforce_section_limits_too_few(self):
        """Should add minimum section if empty."""
        spec = {"required_sections": []}
        result = enforce_section_limits(spec)
        assert len(result["required_sections"]) >= MIN_SECTIONS

    def test_enforce_section_limits_too_many(self):
        """Should trim sections if too many."""
        spec = {"required_sections": [f"Section{i}" for i in range(15)]}
        result = enforce_section_limits(spec)
        assert len(result["required_sections"]) <= MAX_SECTIONS

    def test_validate_spec_for_request_type_status(self):
        """STATUS type should have speculation in forbidden."""
        spec = {
            "response_format": "hybrid",
            "forbidden_content": ["speculation", "estimated values"],
            "required_sections": ["Metric", "Value"]
        }
        is_valid, warnings = validate_spec_for_request_type(spec, "STATUS_METRIC")
        assert is_valid  # Has speculation in forbidden

    def test_validate_spec_for_request_type_design(self):
        """DESIGN_ARCH should have architecture sections."""
        spec = {
            "response_format": "markdown",
            "required_sections": ["Architecture", "Components"]
        }
        is_valid, warnings = validate_spec_for_request_type(spec, "DESIGN_ARCH")
        assert is_valid


# =============================================================================
# Test State Helpers
# =============================================================================

class TestStateHelpers:
    """Tests for state helper functions."""

    def test_get_spec_from_state(self):
        """Should return spec from state."""
        state = {
            "architect_spec": {
                "response_format": "json",
                "required_sections": ["A", "B"]
            }
        }
        spec = get_spec_from_state(state)
        assert spec["response_format"] == "json"

    def test_get_spec_from_state_missing(self):
        """Should return empty dict if no spec."""
        state = {}
        spec = get_spec_from_state(state)
        assert spec == {}

    def test_get_response_format_from_spec(self):
        """Should return response format."""
        state = {"architect_spec": {"response_format": "json"}}
        assert get_response_format_from_spec(state) == "json"

    def test_get_sections_from_spec(self):
        """Should return sections list."""
        state = {"architect_spec": {"required_sections": ["A", "B", "C"]}}
        sections = get_sections_from_spec(state)
        assert sections == ["A", "B", "C"]

    def test_should_use_json_format(self):
        """Should detect JSON format requirement."""
        state = {"architect_spec": {"response_format": "json"}}
        assert should_use_json_format(state) is True

        state = {"architect_spec": {"response_format": "markdown"}}
        assert should_use_json_format(state) is False


# =============================================================================
# Test Contract Check Functions
# =============================================================================

class TestContractCheck:
    """Tests for contract check functions."""

    def test_check_contract_pass(self):
        """Should pass with valid draft."""
        state = {
            "architect_spec": {
                "required_sections": ["Summary", "Answer"],
                "forbidden_content": ["forbidden text"],
                "domain_terms": ["Sprint"],
                "response_format": "markdown"
            },
            "draft_answer": "## Summary\nThis is about Sprint.\n## Answer\nThe answer is here."
        }
        ok, reason, actions = check_contract(state)
        assert ok is True
        assert reason == "ok"

    def test_check_contract_missing_sections(self):
        """Should fail with missing sections."""
        state = {
            "architect_spec": {
                "required_sections": ["Summary", "Evidence", "Conclusion"],
                "forbidden_content": [],
                "domain_terms": [],
                "response_format": "markdown"
            },
            "draft_answer": "## Summary\nSome content here."
        }
        ok, reason, actions = check_contract(state)
        assert ok is False
        assert "missing_required_sections" in reason

    def test_check_contract_forbidden_content(self):
        """Should fail with forbidden content."""
        state = {
            "architect_spec": {
                "required_sections": [],
                "forbidden_content": ["secret data"],
                "domain_terms": [],
                "response_format": "markdown"
            },
            "draft_answer": "This contains secret data that should not be here."
        }
        ok, reason, actions = check_contract(state)
        assert ok is False
        assert "forbidden_content_detected" in reason

    def test_check_contract_no_domain_terms(self):
        """Should fail if no domain terms used."""
        state = {
            "architect_spec": {
                "required_sections": [],
                "forbidden_content": [],
                "domain_terms": ["Sprint", "Velocity", "Backlog"],
                "response_format": "markdown"
            },
            "draft_answer": "This draft uses none of the expected terms."
        }
        ok, reason, actions = check_contract(state)
        assert ok is False
        assert "domain_terms_not_used" in reason

    def test_check_contract_no_draft(self):
        """Should fail with no draft answer."""
        state = {
            "architect_spec": {},
            "draft_answer": ""
        }
        ok, reason, actions = check_contract(state)
        assert ok is False
        assert "no_draft_answer" in reason


# =============================================================================
# Test Status Evidence Check
# =============================================================================

class TestStatusEvidenceCheck:
    """Tests for STATUS type evidence checking."""

    def test_status_evidence_with_references(self):
        """Should pass with evidence references."""
        draft = "The velocity is 45 [1] and completion rate is 80% [2]."
        ok, reason, actions = check_status_evidence(draft)
        assert ok is True

    def test_status_evidence_with_source_mention(self):
        """Should pass with source mentions."""
        draft = "According to the database, velocity is 45."
        ok, reason, actions = check_status_evidence(draft)
        assert ok is True

    def test_status_evidence_no_numbers(self):
        """Should pass if no numbers present."""
        draft = "The sprint is going well with good progress."
        ok, reason, actions = check_status_evidence(draft)
        assert ok is True

    def test_status_evidence_numbers_no_refs(self):
        """Should fail with numbers but no references."""
        draft = "The velocity is 45 and completion rate is 80%."
        ok, reason, actions = check_status_evidence(draft)
        assert ok is False
        assert "numbers_without_evidence_reference" in reason

    def test_check_contract_status_type(self):
        """Full contract check should include STATUS evidence."""
        state = {
            "request_type": "STATUS_METRIC",
            "architect_spec": {
                "required_sections": [],
                "forbidden_content": [],
                "domain_terms": ["Sprint"],
                "response_format": "markdown"
            },
            "draft_answer": "The Sprint velocity is 45 without any source."
        }
        ok, reason, actions = check_contract(state)
        assert ok is False
        assert "numbers_without_evidence" in reason


# =============================================================================
# Test Format Compliance
# =============================================================================

class TestFormatCompliance:
    """Tests for format compliance checking."""

    def test_validate_markdown_format(self):
        """Markdown format should accept text."""
        ok, reason = validate_response_format("Some text", "markdown")
        assert ok is True

    def test_validate_json_format_valid(self):
        """JSON format should validate JSON."""
        ok, reason = validate_response_format('{"key": "value"}', "json")
        assert ok is True

    def test_validate_json_format_invalid(self):
        """JSON format should reject invalid JSON."""
        ok, reason = validate_response_format("This is not JSON", "json")
        assert ok is False
        assert "invalid_json" in reason

    def test_validate_hybrid_format(self):
        """Hybrid format should accept mixed content."""
        ok, reason = validate_response_format("Text with ```json\n{}\n```", "hybrid")
        assert ok is True


# =============================================================================
# Test Hallucination Detection
# =============================================================================

class TestHallucinationDetection:
    """Tests for hallucination pattern detection."""

    def test_hallucination_i_think(self):
        """Should detect 'I think' pattern."""
        ok, reason, actions = check_hallucination_patterns("I think the answer is 42.")
        assert ok is False
        assert "hallucination_pattern" in reason

    def test_hallucination_probably(self):
        """Should detect 'probably' pattern."""
        ok, reason, actions = check_hallucination_patterns("This is probably correct.")
        assert ok is False

    def test_hallucination_clean(self):
        """Should pass clean text."""
        ok, reason, actions = check_hallucination_patterns(
            "According to the data [1], the velocity is 45."
        )
        assert ok is True


# =============================================================================
# Test Evidence Density
# =============================================================================

class TestEvidenceDensity:
    """Tests for evidence density checking."""

    def test_evidence_density_sufficient(self):
        """Should pass with enough references."""
        ok, reason, actions = check_evidence_density(
            "Data [1] shows this. Also [2] confirms.",
            min_references=2
        )
        assert ok is True

    def test_evidence_density_insufficient(self):
        """Should fail with too few references."""
        ok, reason, actions = check_evidence_density(
            "Only one reference [1] here.",
            min_references=2
        )
        assert ok is False


# =============================================================================
# Test Section Depth
# =============================================================================

class TestSectionDepth:
    """Tests for section depth checking."""

    def test_section_depth_sufficient(self):
        """Should pass with sufficient content per section."""
        draft = """## Summary
This section has enough content to meet the minimum requirement.

## Evidence
This section also has sufficient content for validation."""

        ok, reason, actions = check_section_depth(
            draft,
            ["Summary", "Evidence"],
            min_chars_per_section=20
        )
        assert ok is True

    def test_section_depth_shallow(self):
        """Should fail with shallow sections."""
        draft = """## Summary
Short.

## Evidence
Also short."""

        ok, reason, actions = check_section_depth(
            draft,
            ["Summary", "Evidence"],
            min_chars_per_section=100
        )
        assert ok is False


# =============================================================================
# Test Full Contract Check
# =============================================================================

class TestFullContractCheck:
    """Tests for full_contract_check function."""

    def test_full_contract_check_basic(self):
        """Basic mode should run standard checks."""
        state = {
            "architect_spec": {
                "required_sections": ["Answer"],
                "forbidden_content": [],
                "domain_terms": ["Sprint"],
                "response_format": "markdown"
            },
            "draft_answer": "## Answer\nThe Sprint is on track."
        }
        ok, reason, actions = full_contract_check(state, strict=False)
        assert ok is True

    def test_full_contract_check_strict(self):
        """Strict mode should include additional checks."""
        state = {
            "architect_spec": {
                "required_sections": ["Answer"],
                "forbidden_content": [],
                "domain_terms": ["Sprint"],
                "response_format": "markdown"
            },
            "draft_answer": "## Answer\nI think the Sprint is on track."
        }
        ok, reason, actions = full_contract_check(state, strict=True)
        assert ok is False  # "I think" is hallucination


# =============================================================================
# Test Integration: Architect → Contract Check
# =============================================================================

class TestArchitectContractIntegration:
    """Integration tests for Architect → Contract flow."""

    def test_template_spec_passes_contract(self):
        """Template-based spec should work with contract check."""
        # Generate spec from template
        state = {
            "user_query": "What's the sprint velocity?",
            "request_type": "STATUS_METRIC",
            "track": "QUALITY"
        }
        state = architect_outline(state, llm_fn=None)

        # Create compliant draft
        state["draft_answer"] = """## Metric Overview
This report covers the Sprint velocity metric.

## Current Value
The current velocity is 45 points [1] based on DB query.

## Trend Analysis
The trend shows improvement from last Sprint [2].

## Data Source
Data retrieved from the database on 2024-01-15."""

        ok, reason, actions = check_contract(state)
        assert ok is True

    def test_llm_spec_passes_contract(self):
        """LLM-generated spec should work with contract check."""
        mock_llm = MockLLM(make_valid_architect_response(
            response_format="markdown",
            domain_terms=["Project", "Sprint"],
            forbidden_content=["speculation"],
            required_sections=["Overview", "Details"]
        ))

        state = {
            "user_query": "Explain the Project structure",
            "request_type": "KNOWLEDGE_QA",
            "track": "QUALITY"
        }
        state = architect_outline(state, mock_llm)

        # Create compliant draft
        state["draft_answer"] = """## Overview
The Project structure is organized into phases.

## Details
Each Sprint contains multiple tasks and stories."""

        ok, reason, actions = check_contract(state)
        assert ok is True


# =============================================================================
# Test Constants
# =============================================================================

class TestConstants:
    """Tests for module constants."""

    def test_response_formats(self):
        """Should have standard response formats."""
        assert "markdown" in RESPONSE_FORMATS
        assert "json" in RESPONSE_FORMATS
        assert "hybrid" in RESPONSE_FORMATS

    def test_section_limits(self):
        """Section limits should be reasonable."""
        assert MIN_SECTIONS >= 1
        assert MAX_SECTIONS <= 10
        assert MIN_SECTIONS < MAX_SECTIONS

    def test_architect_prompt_has_placeholders(self):
        """Prompt should have format placeholders."""
        assert "{user_query}" in ARCHITECT_PROMPT
        assert "{request_type}" in ARCHITECT_PROMPT
        assert "{track}" in ARCHITECT_PROMPT


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
