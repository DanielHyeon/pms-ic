"""
Risk Data Model Utilities.

Handles risk identification from various sources when dedicated risk table doesn't exist.
Includes lifecycle management for PM maturity tracking.

P2 Enhancement: Risk lifecycle enables "Is the risk being managed?" queries.

Reference: docs/P2_QUALITY_ENHANCEMENT.md
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class RiskSeverity(Enum):
    """Risk severity levels"""
    CRITICAL = "CRITICAL"   # Project failure potential
    HIGH = "HIGH"           # Major delay potential
    MEDIUM = "MEDIUM"       # Minor impact
    LOW = "LOW"             # Negligible impact
    UNKNOWN = "UNKNOWN"


class RiskSource(Enum):
    """Source of risk identification"""
    ISSUE_RISK_TYPE = "issue_risk_type"        # Issues with type=RISK
    ISSUE_RISK_KEYWORD = "issue_risk_keyword"  # Issues with risk keywords
    BLOCKER_HIGH = "blocker_high"              # High-severity blockers
    DERIVED = "derived"                         # Derived from other signals


class RiskLifecycle(Enum):
    """
    Risk lifecycle stages for maturity tracking.

    This enables:
    - "Are there unacknowledged risks?" queries
    - PM maturity metrics (% risks with mitigation)
    - Audit differentiation
    """
    IDENTIFIED = "IDENTIFIED"      # Risk discovered, not yet reviewed
    ACKNOWLEDGED = "ACKNOWLEDGED"  # PM/Owner aware, reviewing
    MITIGATING = "MITIGATING"      # Active mitigation in progress
    ACCEPTED = "ACCEPTED"          # Consciously accepted (documented)
    CLOSED = "CLOSED"              # No longer relevant


@dataclass
class Risk:
    """Unified risk representation with lifecycle"""
    id: str
    title: str
    description: str
    severity: RiskSeverity
    source: RiskSource
    status: str

    # Lifecycle
    lifecycle: RiskLifecycle = RiskLifecycle.IDENTIFIED

    # Ownership
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None

    # Management
    mitigation: Optional[str] = None
    contingency: Optional[str] = None

    # Assessment
    probability: Optional[str] = None  # HIGH/MEDIUM/LOW
    impact: Optional[str] = None       # HIGH/MEDIUM/LOW

    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    original_data: Dict[str, Any] = field(default_factory=dict)

    # Calculated
    score: float = 0.0


def map_issue_to_risk(issue: Dict[str, Any], source: RiskSource) -> Risk:
    """Map an issue record to unified Risk model"""
    # Determine lifecycle based on available data
    lifecycle = RiskLifecycle.IDENTIFIED
    if issue.get("assignee_id"):
        lifecycle = RiskLifecycle.ACKNOWLEDGED
    if issue.get("resolution") or issue.get("mitigation"):
        lifecycle = RiskLifecycle.MITIGATING

    severity_str = (issue.get("severity") or "UNKNOWN").upper()
    try:
        severity = RiskSeverity(severity_str)
    except ValueError:
        severity = RiskSeverity.UNKNOWN

    risk = Risk(
        id=str(issue.get("id")),
        title=issue.get("title", "Unknown"),
        description=issue.get("description") or "",
        severity=severity,
        source=source,
        status=issue.get("status", "OPEN"),
        lifecycle=lifecycle,
        owner_id=issue.get("assignee_id"),
        owner_name=issue.get("assignee_name"),
        mitigation=issue.get("resolution"),  # Use resolution field as mitigation
        created_at=str(issue.get("created_at", "")),
        updated_at=str(issue.get("updated_at", "")),
        original_data=issue,
    )

    risk.score = calculate_risk_score(risk)
    return risk


def calculate_risk_score(risk: Risk) -> float:
    """
    Calculate risk score (0-100) based on severity, lifecycle, and ownership.

    Higher score = higher priority for attention.
    """
    base_score = {
        RiskSeverity.CRITICAL: 80,
        RiskSeverity.HIGH: 60,
        RiskSeverity.MEDIUM: 40,
        RiskSeverity.LOW: 20,
        RiskSeverity.UNKNOWN: 30,
    }.get(risk.severity, 30)

    # Lifecycle adjustments
    lifecycle_adjustment = {
        RiskLifecycle.IDENTIFIED: 15,     # Needs attention
        RiskLifecycle.ACKNOWLEDGED: 5,    # Being reviewed
        RiskLifecycle.MITIGATING: -10,    # Active work
        RiskLifecycle.ACCEPTED: -20,      # Consciously accepted
        RiskLifecycle.CLOSED: -50,        # Should not appear
    }.get(risk.lifecycle, 0)

    base_score += lifecycle_adjustment

    # Boost if no owner assigned
    if not risk.owner_id:
        base_score += 10

    # Boost if no mitigation plan
    if not risk.mitigation and risk.lifecycle not in (RiskLifecycle.ACCEPTED, RiskLifecycle.CLOSED):
        base_score += 10

    return max(0, min(100, base_score))


def prioritize_risks(risks: List[Risk]) -> List[Risk]:
    """Sort risks by calculated score (highest first)"""
    return sorted(risks, key=lambda r: r.score, reverse=True)


def generate_risk_summary(risks: List[Risk]) -> Dict[str, Any]:
    """Generate comprehensive summary statistics for risks"""
    if not risks:
        return {
            "total": 0,
            "by_severity": {},
            "by_lifecycle": {},
            "unassigned": 0,
            "no_mitigation": 0,
            "needs_attention": 0,
            "top_risks": [],
            "maturity_score": 0,
        }

    by_severity: Dict[str, int] = {}
    by_lifecycle: Dict[str, int] = {}
    unassigned = 0
    no_mitigation = 0
    needs_attention = 0

    for risk in risks:
        # By severity
        sev = risk.severity.value
        by_severity[sev] = by_severity.get(sev, 0) + 1

        # By lifecycle
        lc = risk.lifecycle.value
        by_lifecycle[lc] = by_lifecycle.get(lc, 0) + 1

        # Counts
        if not risk.owner_id:
            unassigned += 1

        if not risk.mitigation and risk.lifecycle not in (RiskLifecycle.ACCEPTED, RiskLifecycle.CLOSED):
            no_mitigation += 1

        if risk.score >= 60:  # High priority threshold
            needs_attention += 1

    prioritized = prioritize_risks(risks)

    # Calculate PM maturity score (0-100)
    # Based on: % risks with owners, % with mitigation plans, % past IDENTIFIED stage
    total = len(risks)
    active_risks = [r for r in risks if r.lifecycle != RiskLifecycle.CLOSED]

    if active_risks:
        owned_pct = (len(active_risks) - unassigned) / len(active_risks) * 40
        mitigated_pct = (len(active_risks) - no_mitigation) / len(active_risks) * 40
        managed_pct = len([r for r in active_risks if r.lifecycle != RiskLifecycle.IDENTIFIED]) / len(active_risks) * 20
        maturity_score = round(owned_pct + mitigated_pct + managed_pct, 1)
    else:
        maturity_score = 100  # No risks = perfect score

    return {
        "total": total,
        "by_severity": by_severity,
        "by_lifecycle": by_lifecycle,
        "unassigned": unassigned,
        "no_mitigation": no_mitigation,
        "needs_attention": needs_attention,
        "top_risks": [_risk_to_dict(r) for r in prioritized[:5]],
        "maturity_score": maturity_score,
    }


def _risk_to_dict(risk: Risk) -> Dict[str, Any]:
    """Convert Risk to dictionary for serialization"""
    return {
        "id": risk.id,
        "title": risk.title,
        "severity": risk.severity.value,
        "lifecycle": risk.lifecycle.value,
        "owner_name": risk.owner_name,
        "has_mitigation": bool(risk.mitigation),
        "score": risk.score,
    }


# =============================================================================
# Risk Identification Rules
# =============================================================================

RISK_KEYWORDS_KOREAN = [
    "리스크", "위험", "우려", "잠재적 문제", "장애 가능성",
    "지연 예상", "품질 저하", "일정 초과", "예산 초과",
]

RISK_KEYWORDS_ENGLISH = [
    "risk", "hazard", "threat", "vulnerability", "concern",
    "potential issue", "blocker", "delay risk", "quality risk",
]


def is_risk_by_keyword(title: str, description: str = "") -> bool:
    """Check if text contains risk-related keywords"""
    text = (title + " " + (description or "")).lower()

    for kw in RISK_KEYWORDS_KOREAN + RISK_KEYWORDS_ENGLISH:
        if kw.lower() in text:
            return True

    return False


def derive_risks_from_blockers(blockers: List[Dict[str, Any]]) -> List[Risk]:
    """
    Derive risks from high-severity blockers.

    Blockers that have been open for >3 days indicate systemic issues.
    """
    derived_risks = []

    for blocker in blockers:
        if blocker.get("severity") not in ("CRITICAL", "HIGH"):
            continue

        severity_str = blocker.get("severity", "HIGH")
        try:
            severity = RiskSeverity(severity_str)
        except ValueError:
            severity = RiskSeverity.HIGH

        risk = Risk(
            id=f"derived-{blocker.get('id')}",
            title=f"[Derived] {blocker.get('title')}",
            description=f"High-severity blocker indicates potential risk: {blocker.get('description', '')}",
            severity=severity,
            source=RiskSource.DERIVED,
            status="OPEN",
            lifecycle=RiskLifecycle.IDENTIFIED,
            owner_id=blocker.get("assignee_id"),
            owner_name=blocker.get("assignee_name"),
            original_data=blocker,
        )
        risk.score = calculate_risk_score(risk)
        derived_risks.append(risk)

    return derived_risks


def process_risks_from_issues(
    issues: List[Dict[str, Any]],
    blockers: List[Dict[str, Any]] = None,
) -> List[Risk]:
    """
    Process risks from multiple sources.

    Returns unified list of Risk objects with proper scoring.
    """
    risks: List[Risk] = []

    # Process issues with type=RISK
    for issue in issues:
        issue_type = (issue.get("type") or "").upper()
        if issue_type == "RISK":
            risks.append(map_issue_to_risk(issue, RiskSource.ISSUE_RISK_TYPE))
        elif is_risk_by_keyword(issue.get("title", ""), issue.get("description", "")):
            risks.append(map_issue_to_risk(issue, RiskSource.ISSUE_RISK_KEYWORD))

    # Add derived risks from blockers
    if blockers:
        risks.extend(derive_risks_from_blockers(blockers))

    # Sort by score
    return prioritize_risks(risks)
