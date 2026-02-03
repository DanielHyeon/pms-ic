"""
Explainability Layer for AI Assistant Responses (v2.0).

v2.0 CHANGES:
- public/debug separation (R6: security)
- Meaningful evidence validation via ExplainabilityPolicy (R1)
- data_freshness as measurable value (seconds)

PURPOSE:
- Every non-CASUAL response MUST explain WHY it gave that answer
- Tracks intent classification, query execution, signal detection, rule application

PHILOSOPHY (P2 Inheritance):
- Explainability is MANDATORY, not optional
- If a response lacks explanation, it's a BUG
- Evidence must be machine-readable AND human-readable

============================================================
EVIDENCE CATEGORIES (for meaningful validation)
============================================================
1. CLASSIFIER: How intent was determined
2. DATA_PROVENANCE: Where data came from (query/cache/inference)
3. JUDGMENT: Rules/signals applied
4. SCOPE: Why scope was limited/empty
============================================================

============================================================
SECURITY: PUBLIC vs DEBUG
============================================================
- public: Safe for user display (no SQL, no table names)
- debug: For logs/admin only (full details)
============================================================
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Evidence Types
# =============================================================================

class EvidenceKind(str, Enum):
    """Types of evidence that support a response."""
    # Category 1: Classification
    CLASSIFIER = "classifier"     # Intent classification result

    # Category 2: Data Provenance (at least one required)
    QUERY = "query"               # SQL/DB query execution
    CACHE = "cache"               # Cached data used
    INFERENCE = "inference"       # LLM-based inference
    RAG = "rag"                   # RAG retrieval

    # Category 3: Judgment
    SIGNAL = "signal"             # Business signal detection
    RULE = "rule"                 # Business rule application

    # Category 4: Scope explanation
    SCOPE = "scope"               # Why data is limited/empty
    FALLBACK = "fallback"         # Fallback mechanism triggered


# Evidence category mapping for validation
EVIDENCE_CATEGORIES = {
    "classifier": {EvidenceKind.CLASSIFIER},
    "data_provenance": {
        EvidenceKind.QUERY,
        EvidenceKind.CACHE,
        EvidenceKind.INFERENCE,
        EvidenceKind.RAG,
    },
    "judgment": {EvidenceKind.SIGNAL, EvidenceKind.RULE},
    "scope": {EvidenceKind.SCOPE, EvidenceKind.FALLBACK},
}


# =============================================================================
# Evidence Item
# =============================================================================

@dataclass
class EvidenceItem:
    """
    A single piece of evidence supporting the response.

    Attributes:
        kind: Type of evidence (query, signal, rule, etc.)
        summary: Human-readable description (PUBLIC - no sensitive data!)
        meta: Machine-readable details for debugging (DEBUG - may contain sensitive data)
    """
    kind: str
    summary: str  # PUBLIC: Safe for user display
    meta: Dict[str, Any] = field(default_factory=dict)  # DEBUG: For logs only

    def to_dict(self) -> Dict[str, Any]:
        """Full dict including debug info."""
        return {
            "kind": self.kind,
            "summary": self.summary,
            "meta": self.meta,
        }

    def to_public_dict(self) -> Dict[str, Any]:
        """Public dict without sensitive debug info."""
        return {
            "kind": self.kind,
            "summary": self.summary,
            # meta is intentionally omitted for security
        }


# =============================================================================
# Data Freshness (measurable)
# =============================================================================

@dataclass
class DataFreshness:
    """
    Measurable data freshness (v2.0 improvement).

    Instead of just "realtime"/"cached"/"stale" strings,
    we track actual timestamps and age.
    """
    source_updated_at: Optional[datetime] = None  # When source data was last updated
    fetched_at: datetime = field(default_factory=datetime.utcnow)  # When we fetched it
    stale_threshold_seconds: int = 3600  # 1 hour default

    @property
    def age_seconds(self) -> Optional[int]:
        """How old the data is in seconds."""
        if self.source_updated_at is None:
            return None
        return int((self.fetched_at - self.source_updated_at).total_seconds())

    @property
    def freshness_level(self) -> str:
        """Human-readable freshness level."""
        if self.age_seconds is None:
            return "unknown"
        if self.age_seconds < 60:
            return "realtime"
        if self.age_seconds < self.stale_threshold_seconds:
            return "recent"
        return "stale"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_updated_at": self.source_updated_at.isoformat() if self.source_updated_at else None,
            "fetched_at": self.fetched_at.isoformat(),
            "age_seconds": self.age_seconds,
            "freshness_level": self.freshness_level,
        }


# =============================================================================
# Explainability Contract
# =============================================================================

@dataclass
class Explainability:
    """
    Full explanation of how a response was generated.

    MANDATORY for all non-CASUAL intents.

    v2.0 CHANGES:
    - public/debug separation for security
    - data_freshness as measurable DataFreshness object
    - Validation via ExplainabilityPolicy

    Attributes:
        intent: The classified intent (lowercase snake_case)
        intent_confidence: Confidence score from classifier (0.0-1.0)
        routing_reason: Why this routing path was chosen (PUBLIC)
        evidence: List of supporting evidence items
        caveats: Known limitations or uncertainties
        data_freshness: Measurable freshness info
    """
    intent: str
    intent_confidence: float
    routing_reason: str  # PUBLIC: Safe for display
    evidence: List[EvidenceItem] = field(default_factory=list)
    caveats: List[str] = field(default_factory=list)
    data_freshness: DataFreshness = field(default_factory=DataFreshness)

    def add_evidence(
        self,
        kind: str,
        summary: str,
        **meta: Any,
    ) -> "Explainability":
        """
        Fluent API to add evidence.

        IMPORTANT: summary should be PUBLIC-safe (no SQL, no table names).
        Put sensitive details in meta (for debug logs only).

        Usage:
            exp.add_evidence(
                "query",
                "Fetched active sprint data",  # PUBLIC
                table="sprint",  # DEBUG (in meta)
                sql="SELECT * FROM...",  # DEBUG (in meta)
            )
        """
        self.evidence.append(EvidenceItem(
            kind=kind,
            summary=summary,
            meta=meta,
        ))
        return self

    def add_classifier_evidence(
        self,
        matched_patterns: List[str],
        confidence: float,
    ) -> "Explainability":
        """Add classifier evidence (REQUIRED for all non-CASUAL)."""
        patterns_str = ", ".join(matched_patterns[:3]) if matched_patterns else "direct match"
        return self.add_evidence(
            EvidenceKind.CLASSIFIER.value,
            f"Intent classified: {patterns_str}",
            matched_patterns=matched_patterns,
            confidence=confidence,
        )

    def add_query_evidence(
        self,
        description: str,
        row_count: int,
        table: str,  # Goes to meta only
        sql: Optional[str] = None,  # Goes to meta only
    ) -> "Explainability":
        """Add database query evidence."""
        # PUBLIC summary - no table name
        summary = f"{description}: {row_count} rows"
        return self.add_evidence(
            EvidenceKind.QUERY.value,
            summary,
            table=table,
            row_count=row_count,
            sql=sql,
        )

    def add_scope_evidence(
        self,
        reason: str,
        scope_details: Optional[Dict[str, Any]] = None,
    ) -> "Explainability":
        """Add scope explanation evidence (for EMPTY results)."""
        return self.add_evidence(
            EvidenceKind.SCOPE.value,
            f"Scope: {reason}",
            scope_details=scope_details or {},
        )

    def add_fallback_evidence(
        self,
        reason: str,
        fallback_type: str,
    ) -> "Explainability":
        """Add fallback mechanism evidence."""
        return self.add_evidence(
            EvidenceKind.FALLBACK.value,
            f"Fallback used: {reason}",
            fallback_type=fallback_type,
        )

    def add_signal_evidence(
        self,
        signal_name: str,
        signal_value: Any,
    ) -> "Explainability":
        """Add business signal evidence."""
        return self.add_evidence(
            EvidenceKind.SIGNAL.value,
            f"Signal detected: {signal_name}",
            signal_name=signal_name,
            signal_value=signal_value,
        )

    def add_rule_evidence(
        self,
        rule_name: str,
        rule_outcome: str,
    ) -> "Explainability":
        """Add business rule evidence."""
        return self.add_evidence(
            EvidenceKind.RULE.value,
            f"Rule applied: {rule_name} -> {rule_outcome}",
            rule_name=rule_name,
            rule_outcome=rule_outcome,
        )

    def add_caveat(self, caveat: str) -> "Explainability":
        """Add a known limitation or uncertainty."""
        self.caveats.append(caveat)
        return self

    def get_evidence_by_kind(self, kind: str) -> List[EvidenceItem]:
        """Get all evidence of a specific kind."""
        return [e for e in self.evidence if e.kind == kind]

    def has_evidence_category(self, category: str) -> bool:
        """Check if evidence exists for a category."""
        category_kinds = EVIDENCE_CATEGORIES.get(category, set())
        kind_values = {k.value if isinstance(k, Enum) else k for k in category_kinds}
        return any(e.kind in kind_values for e in self.evidence)

    def to_dict(self) -> Dict[str, Any]:
        """Full dict including debug info (for logging)."""
        return {
            "intent": self.intent,
            "intent_confidence": self.intent_confidence,
            "routing_reason": self.routing_reason,
            "evidence": [e.to_dict() for e in self.evidence],
            "caveats": self.caveats,
            "data_freshness": self.data_freshness.to_dict(),
        }

    def to_public_dict(self) -> Dict[str, Any]:
        """Public dict without sensitive debug info (for user display)."""
        return {
            "intent": self.intent,
            "intent_confidence": self.intent_confidence,
            "routing_reason": self.routing_reason,
            "evidence": [e.to_public_dict() for e in self.evidence],
            "caveats": self.caveats,
            "data_freshness": {
                "freshness_level": self.data_freshness.freshness_level,
            },
        }

    def to_human_readable(self) -> str:
        """
        Generate human-readable explanation for display.

        Uses PUBLIC data only (no sensitive info).

        v2.1 CHANGE (R9): Evidence order is now DETERMINISTIC.
        Category priority: classifier -> data_provenance -> judgment -> scope
        This ensures UX consistency regardless of evidence addition order.
        """
        lines = []

        # Routing reason
        lines.append(f"**Classification**: {self.intent} (confidence: {self.intent_confidence:.0%})")
        lines.append(f"**Reason**: {self.routing_reason}")

        # Evidence - one per category for clarity
        # v2.1: FIXED category order for UX consistency (R9)
        if self.evidence:
            lines.append("")
            lines.append("**Evidence**:")
            rendered_categories = set()

            # FIXED priority order (v2.1 - R9)
            CATEGORY_PRIORITY = ["classifier", "data_provenance", "judgment", "scope"]

            for priority_cat in CATEGORY_PRIORITY:
                if priority_cat in rendered_categories:
                    continue
                category_kinds = EVIDENCE_CATEGORIES.get(priority_cat, set())
                kind_values = {k.value if isinstance(k, Enum) else k for k in category_kinds}
                for ev in self.evidence:
                    if ev.kind in kind_values and priority_cat not in rendered_categories:
                        icon = _get_evidence_icon(ev.kind)
                        lines.append(f"  - {icon} {ev.summary}")
                        rendered_categories.add(priority_cat)
                        break  # One evidence per category

        # Caveats
        if self.caveats:
            lines.append("")
            lines.append("**Note**:")
            for caveat in self.caveats[:2]:  # Max 2
                lines.append(f"  - {caveat}")

        # Freshness warning if stale
        if self.data_freshness.freshness_level == "stale":
            lines.append("")
            lines.append(f"Data may be outdated ({self.data_freshness.age_seconds} seconds old)")

        return "\n".join(lines)


# =============================================================================
# Factory Functions
# =============================================================================

def create_explainability(
    intent: str,
    confidence: float,
    routing_reason: str,
) -> Explainability:
    """
    Factory function to create Explainability with required fields.

    Usage:
        exp = create_explainability("backlog_list", 0.95, "Matched backlog keyword")
        exp.add_classifier_evidence(["backlog"], 0.95)
        exp.add_query_evidence("Fetched backlog items", 15, table="user_story")
    """
    return Explainability(
        intent=intent,
        intent_confidence=confidence,
        routing_reason=routing_reason,
    )


# =============================================================================
# Helpers
# =============================================================================

def _get_evidence_icon(kind: str) -> str:
    """Get icon for evidence type."""
    icons = {
        EvidenceKind.QUERY.value: "search",
        EvidenceKind.SIGNAL.value: "signal",
        EvidenceKind.RULE.value: "rule",
        EvidenceKind.FALLBACK.value: "fallback",
        EvidenceKind.INFERENCE.value: "inference",
        EvidenceKind.CACHE.value: "cache",
        EvidenceKind.CLASSIFIER.value: "classifier",
        EvidenceKind.SCOPE.value: "scope",
        EvidenceKind.RAG.value: "rag",
    }
    return icons.get(kind, "info")
