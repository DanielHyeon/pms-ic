"""
Validate Skills - Verification and validation

Skills:
- ValidateEvidenceSkill: Validate claims against evidence
- ValidatePolicySkill: Validate actions against policy
"""

from typing import Dict, Any, List, Optional
import logging

from . import BaseSkill, SkillCategory, SkillInput, SkillOutput

logger = logging.getLogger(__name__)


class ValidateEvidenceSkill(BaseSkill):
    """
    Validate claims against evidence.

    Input:
        - claims: List of claims to validate
        - evidence: Available evidence
        - threshold: Minimum evidence required (default: 1)

    Output:
        - result: Validation results per claim
        - confidence: Overall validation confidence
    """

    name = "validate_evidence"
    category = SkillCategory.VALIDATE
    description = "Validate claims against evidence sources"
    version = "1.0.0"

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "claims" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: claims required"
            )

        claims = input.data.get("claims", [])
        evidence = input.data.get("evidence", [])
        threshold = input.options.get("threshold", 1)

        validated_claims = []
        unvalidated_claims = []

        for claim in claims:
            claim_text = claim if isinstance(claim, str) else claim.get("text", "")
            supporting = self._find_supporting_evidence(claim_text, evidence)

            if len(supporting) >= threshold:
                validated_claims.append({
                    "claim": claim_text,
                    "status": "validated",
                    "evidence_count": len(supporting),
                    "supporting_evidence": supporting,
                })
            else:
                unvalidated_claims.append({
                    "claim": claim_text,
                    "status": "unvalidated",
                    "evidence_count": len(supporting),
                    "reason": "Insufficient evidence",
                })

        total = len(claims) or 1
        confidence = len(validated_claims) / total

        result_evidence = [
            {
                "source_type": "evidence",
                "source_id": e.get("id", str(i)),
                "title": e.get("title", "Evidence"),
                "relevance": e.get("relevance", 0.5),
            }
            for i, e in enumerate(evidence)
        ]

        return SkillOutput(
            result={
                "validated": validated_claims,
                "unvalidated": unvalidated_claims,
                "validation_rate": confidence,
            },
            confidence=confidence,
            evidence=result_evidence,
            metadata={
                "total_claims": len(claims),
                "validated_count": len(validated_claims),
                "threshold": threshold,
            }
        )

    def _find_supporting_evidence(self, claim: str, evidence: List[Dict]) -> List[Dict]:
        """Find evidence supporting a claim."""
        supporting = []
        claim_lower = claim.lower()
        claim_words = set(claim_lower.split())

        for e in evidence:
            e_text = (e.get("title", "") + " " + e.get("content", "") + " " + e.get("snippet", "")).lower()
            e_words = set(e_text.split())

            # Simple overlap matching
            overlap = len(claim_words & e_words)
            if overlap >= 2:
                supporting.append({
                    "id": e.get("id"),
                    "title": e.get("title"),
                    "overlap": overlap,
                    "relevance": min(overlap / len(claim_words), 1.0) if claim_words else 0,
                })

        return supporting


class ValidatePolicySkill(BaseSkill):
    """
    Validate actions against policy.

    Input:
        - action: Action to validate
        - role: User's role
        - project_id: Project context
        - resource_type: Type of resource being accessed

    Output:
        - result: Policy validation result
        - confidence: Validation confidence
    """

    name = "validate_policy"
    category = SkillCategory.VALIDATE
    description = "Validate actions against RBAC and policy rules"
    version = "1.0.0"

    # Role permissions matrix
    ROLE_PERMISSIONS = {
        "admin": {
            "actions": ["read", "write", "delete", "execute", "commit", "approve"],
            "resources": ["all"],
            "max_authority": "commit",
        },
        "sponsor": {
            "actions": ["read", "approve", "commit"],
            "resources": ["report", "decision", "milestone"],
            "max_authority": "commit",
        },
        "pmo_head": {
            "actions": ["read", "write", "execute", "approve"],
            "resources": ["project", "phase", "report", "resource"],
            "max_authority": "execute",
        },
        "pm": {
            "actions": ["read", "write", "execute"],
            "resources": ["task", "sprint", "backlog", "meeting", "report"],
            "max_authority": "execute",
        },
        "scrum_master": {
            "actions": ["read", "write", "execute"],
            "resources": ["sprint", "backlog", "task", "meeting"],
            "max_authority": "decide",
        },
        "developer": {
            "actions": ["read", "write"],
            "resources": ["task", "code", "document"],
            "max_authority": "suggest",
        },
        "qa": {
            "actions": ["read", "write"],
            "resources": ["test", "issue", "defect"],
            "max_authority": "suggest",
        },
        "viewer": {
            "actions": ["read"],
            "resources": ["report", "dashboard"],
            "max_authority": "suggest",
        },
    }

    # Data boundary rules
    DATA_BOUNDARY_RULES = {
        "project_scope": True,  # Enforce project scope
        "tenant_isolation": True,  # Enforce tenant isolation
        "sensitive_fields": ["password", "salary", "ssn", "credit_card"],
    }

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "action" in data and "role" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: action and role required"
            )

        action = input.data.get("action")
        role = input.data.get("role", "").lower()
        project_id = input.data.get("project_id")
        resource_type = input.data.get("resource_type", "general")
        authority_level = input.data.get("authority_level", "suggest")

        # Check role permissions
        role_config = self.ROLE_PERMISSIONS.get(role, self.ROLE_PERMISSIONS["viewer"])

        # Validate action
        action_allowed = action in role_config["actions"]

        # Validate resource
        resources = role_config["resources"]
        resource_allowed = "all" in resources or resource_type in resources

        # Validate authority level
        authority_order = ["suggest", "decide", "execute", "commit"]
        max_authority = role_config["max_authority"]
        max_idx = authority_order.index(max_authority)
        requested_idx = authority_order.index(authority_level) if authority_level in authority_order else 0
        authority_allowed = requested_idx <= max_idx

        # Check data boundaries
        boundary_check = self._check_data_boundaries(input.data)

        # Aggregate result
        is_allowed = action_allowed and resource_allowed and authority_allowed and boundary_check["allowed"]

        denied_reasons = []
        if not action_allowed:
            denied_reasons.append(f"Action '{action}' not permitted for role '{role}'")
        if not resource_allowed:
            denied_reasons.append(f"Resource '{resource_type}' not accessible")
        if not authority_allowed:
            denied_reasons.append(f"Authority level '{authority_level}' exceeds max '{max_authority}'")
        if not boundary_check["allowed"]:
            denied_reasons.extend(boundary_check["violations"])

        evidence = []
        if denied_reasons:
            for reason in denied_reasons:
                evidence.append({
                    "source_type": "policy",
                    "source_id": "rbac",
                    "title": "Policy violation",
                    "relevance": 1.0,
                })

        return SkillOutput(
            result={
                "allowed": is_allowed,
                "action_allowed": action_allowed,
                "resource_allowed": resource_allowed,
                "authority_allowed": authority_allowed,
                "boundary_check": boundary_check,
                "denied_reasons": denied_reasons,
                "effective_permissions": role_config,
            },
            confidence=1.0 if is_allowed else 0.9,  # High confidence in policy checks
            evidence=evidence,
            metadata={
                "role": role,
                "action": action,
                "resource_type": resource_type,
                "authority_level": authority_level,
            }
        )

    def _check_data_boundaries(self, data: Dict) -> Dict:
        """Check data boundary rules."""
        violations = []

        # Check for sensitive fields in request
        request_str = str(data).lower()
        for field in self.DATA_BOUNDARY_RULES["sensitive_fields"]:
            if field in request_str:
                violations.append(f"Sensitive field '{field}' detected in request")

        # Check project scope (simplified)
        # In real implementation, would verify project_id matches authorized projects

        return {
            "allowed": len(violations) == 0,
            "violations": violations,
        }

    def _get_input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "data": {
                    "type": "object",
                    "properties": {
                        "action": {"type": "string", "enum": ["read", "write", "delete", "execute", "commit", "approve"]},
                        "role": {"type": "string"},
                        "project_id": {"type": "string"},
                        "resource_type": {"type": "string"},
                        "authority_level": {"type": "string", "enum": ["suggest", "decide", "execute", "commit"]},
                    },
                    "required": ["action", "role"],
                },
            },
        }
