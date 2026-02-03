"""
ExplainabilityPolicy: Enforces "meaningful" evidence combinations.

PURPOSE:
- Prevent "explainability exists but is meaningless" (R1)
- Evidence >= 1 is not enough; we need SPECIFIC combinations

============================================================
MINIMUM REQUIREMENTS
============================================================
1. CLASSIFIER evidence: Always required (how was intent determined?)
2. DATA_PROVENANCE evidence: Always required (where did data come from?)
3. If EMPTY: SCOPE evidence required (why is it empty?)
============================================================

PHILOSOPHY:
- Prevent "form-only explanations" - allow only "real explanations"
- Enforce via tests so meaningless explanations don't go to production
"""

from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from observability.explainability import Explainability

from observability.explainability import EVIDENCE_CATEGORIES, EvidenceKind


class ExplainabilityPolicy:
    """
    Policy enforcement for meaningful explainability.

    Usage:
        errors = ExplainabilityPolicy.validate(explainability, is_empty=True)
        if errors:
            raise ValueError(f"Explainability policy violation: {errors}")
    """

    @staticmethod
    def validate(
        exp: "Explainability",
        is_empty: bool = False,
    ) -> List[str]:
        """
        Validate explainability meets minimum requirements.

        Args:
            exp: Explainability object to validate
            is_empty: Whether the response data is empty

        Returns:
            List of validation errors (empty if valid)
        """
        errors = []

        # Requirement 1: CLASSIFIER evidence required
        if not exp.has_evidence_category("classifier"):
            errors.append(
                "POLICY: Missing CLASSIFIER evidence - "
                "must explain how intent was determined"
            )

        # Requirement 2: DATA_PROVENANCE evidence required
        if not exp.has_evidence_category("data_provenance"):
            errors.append(
                "POLICY: Missing DATA_PROVENANCE evidence - "
                "must explain where data came from (query/cache/inference)"
            )

        # Requirement 3: If EMPTY, SCOPE evidence required
        if is_empty and not exp.has_evidence_category("scope"):
            errors.append(
                "POLICY: Missing SCOPE evidence for empty result - "
                "must explain WHY data is empty (scope/filter/condition)"
            )

        # Requirement 4: Confidence must be reasonable
        if exp.intent_confidence < 0.0 or exp.intent_confidence > 1.0:
            errors.append(
                f"POLICY: Invalid confidence {exp.intent_confidence} - "
                "must be between 0.0 and 1.0"
            )

        return errors

    @staticmethod
    def validate_error(
        exp: "Explainability",
    ) -> List[str]:
        """
        Validate explainability for ERROR status responses (v2.1 - R7).

        ERROR status MUST have one of:
        - RULE evidence (blocking rule applied)
        - SCOPE evidence (permission/scope issue)
        - FALLBACK evidence (why fallback was used)

        Without this, we get "unexplained errors" which destroy user trust.
        """
        errors = []

        # Base validation still required
        errors.extend(ExplainabilityPolicy.validate(exp, is_empty=False))

        # ERROR-specific: Must explain WHY it failed
        has_error_explanation = (
            exp.has_evidence_category("scope") or
            exp.has_evidence_category("judgment")  # includes RULE
        )

        if not has_error_explanation:
            errors.append(
                "POLICY: ERROR status requires SCOPE or RULE/FALLBACK evidence - "
                "must explain WHY the error occurred"
            )

        return errors

    @staticmethod
    def validate_strict(
        exp: "Explainability",
        is_empty: bool = False,
    ) -> List[str]:
        """
        Strict validation with additional checks.

        Use for high-importance intents.
        """
        errors = ExplainabilityPolicy.validate(exp, is_empty)

        # Strict: At least 2 evidence items
        if len(exp.evidence) < 2:
            errors.append(
                "STRICT POLICY: Must have at least 2 evidence items"
            )

        # Strict: routing_reason must be meaningful (not empty, not generic)
        if not exp.routing_reason or len(exp.routing_reason) < 10:
            errors.append(
                "STRICT POLICY: routing_reason must be meaningful (>10 chars)"
            )

        return errors

    @staticmethod
    def get_missing_categories(exp: "Explainability", is_empty: bool = False) -> List[str]:
        """Get list of missing required categories."""
        missing = []

        if not exp.has_evidence_category("classifier"):
            missing.append("classifier")

        if not exp.has_evidence_category("data_provenance"):
            missing.append("data_provenance")

        if is_empty and not exp.has_evidence_category("scope"):
            missing.append("scope")

        return missing
