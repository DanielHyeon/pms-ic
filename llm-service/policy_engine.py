"""
L0 Policy Engine - Product Rules Enforcement

Enforces PMS-specific rules before any LLM call:
- Permission/project scope control
- PII masking
- Scrum rules (WIP limits, sprint scope policies)
- Response format/length limits

Reference: docs/PMS 최적화 방안.md
"""

import re
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

@dataclass(frozen=True)
class PolicyConfig:
    """Policy engine configuration"""
    # Response limits
    MAX_RESPONSE_LENGTH: int = 4000
    MIN_RESPONSE_LENGTH: int = 10

    # PII patterns
    ENABLE_PII_MASKING: bool = True

    # Scope validation
    ENABLE_SCOPE_VALIDATION: bool = True

    # Scrum rules
    ENABLE_SCRUM_RULES: bool = True
    DEFAULT_WIP_LIMIT: int = 5

    # Blocked patterns
    ENABLE_CONTENT_FILTERING: bool = True


POLICY_CONFIG = PolicyConfig()


# =============================================================================
# Policy Result Types
# =============================================================================

class PolicyAction(Enum):
    """Policy enforcement action"""
    ALLOW = "allow"
    BLOCK = "block"
    MODIFY = "modify"
    WARN = "warn"


@dataclass
class PolicyCheckResult:
    """Result of a policy check"""
    action: PolicyAction
    reason: Optional[str] = None
    modified_content: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


@dataclass
class PolicyResult:
    """Aggregated result from all policy checks"""
    passed: bool
    action: PolicyAction
    checks: Dict[str, PolicyCheckResult] = field(default_factory=dict)
    blocked_reason: Optional[str] = None
    modified_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)


# =============================================================================
# PII Masker
# =============================================================================

class PIIMasker:
    """Masks personally identifiable information in messages"""

    # Phone number patterns (Korean and international)
    PHONE_PATTERNS = [
        r'\d{3}[-.\s]?\d{4}[-.\s]?\d{4}',  # 010-1234-5678
        r'\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}',  # 02-123-4567
        r'\+\d{1,3}[-.\s]?\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}',  # +82-10-1234-5678
    ]

    # Email pattern
    EMAIL_PATTERN = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'

    # Korean resident registration number (partial)
    RRN_PATTERN = r'\d{6}[-\s]?\d{7}'

    # Credit card pattern
    CARD_PATTERN = r'\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}'

    def __init__(self, config: PolicyConfig = POLICY_CONFIG):
        self.config = config
        self.patterns = self._compile_patterns()

    def _compile_patterns(self) -> List[Tuple[re.Pattern, str, str]]:
        """Compile all PII patterns"""
        patterns = []

        for phone_pattern in self.PHONE_PATTERNS:
            patterns.append((
                re.compile(phone_pattern),
                "[PHONE_MASKED]",
                "phone"
            ))

        patterns.append((
            re.compile(self.EMAIL_PATTERN),
            "[EMAIL_MASKED]",
            "email"
        ))

        patterns.append((
            re.compile(self.RRN_PATTERN),
            "[RRN_MASKED]",
            "rrn"
        ))

        patterns.append((
            re.compile(self.CARD_PATTERN),
            "[CARD_MASKED]",
            "card"
        ))

        return patterns

    def check(self, message: str) -> PolicyCheckResult:
        """Check for PII in message"""
        if not self.config.ENABLE_PII_MASKING:
            return PolicyCheckResult(action=PolicyAction.ALLOW)

        found_pii = []
        modified = message

        for pattern, replacement, pii_type in self.patterns:
            matches = pattern.findall(message)
            if matches:
                found_pii.append({
                    "type": pii_type,
                    "count": len(matches)
                })
                modified = pattern.sub(replacement, modified)

        if found_pii:
            logger.warning(f"PII detected and masked: {found_pii}")
            return PolicyCheckResult(
                action=PolicyAction.MODIFY,
                reason=f"PII detected: {[p['type'] for p in found_pii]}",
                modified_content=modified,
                warnings=[f"Found {p['count']} {p['type']} pattern(s)" for p in found_pii],
                metadata={"pii_found": found_pii}
            )

        return PolicyCheckResult(action=PolicyAction.ALLOW)

    def mask(self, message: str) -> str:
        """Mask all PII in message"""
        result = self.check(message)
        return result.modified_content if result.modified_content else message


# =============================================================================
# Scope Validator
# =============================================================================

class ScopeValidator:
    """Validates project/user scope access"""

    def __init__(self, config: PolicyConfig = POLICY_CONFIG):
        self.config = config

    def check(
        self,
        message: str,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_permissions: Optional[List[str]] = None,
        user_projects: Optional[List[str]] = None,
    ) -> PolicyCheckResult:
        """Check if user has access to requested scope"""
        if not self.config.ENABLE_SCOPE_VALIDATION:
            return PolicyCheckResult(action=PolicyAction.ALLOW)

        warnings = []

        # Check if user is trying to access another project
        if project_id and user_projects:
            if project_id not in user_projects:
                logger.warning(f"User {user_id} attempting to access project {project_id} without permission")
                return PolicyCheckResult(
                    action=PolicyAction.BLOCK,
                    reason=f"Access denied to project {project_id}",
                    metadata={"attempted_project": project_id}
                )

        # Check for cross-project data access patterns in message
        cross_project_patterns = [
            r"다른\s*프로젝트",
            r"모든\s*프로젝트",
            r"전체\s*프로젝트",
            r"other\s*project",
            r"all\s*projects",
        ]

        for pattern in cross_project_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                warnings.append(f"Cross-project access pattern detected: {pattern}")

        if warnings:
            return PolicyCheckResult(
                action=PolicyAction.WARN,
                warnings=warnings,
                metadata={"scope_warnings": warnings}
            )

        return PolicyCheckResult(action=PolicyAction.ALLOW)


# =============================================================================
# Scrum Rule Enforcer
# =============================================================================

class ScrumRuleEnforcer:
    """Enforces scrum/agile rules"""

    # Patterns that indicate sprint scope changes
    SPRINT_CHANGE_PATTERNS = [
        r"스프린트.*?(추가|삭제|변경|수정)",
        r"(추가|삭제|변경|수정).*?스프린트",
        r"sprint.*?(add|remove|change|modify)",
    ]

    # Patterns that indicate WIP violations
    WIP_VIOLATION_PATTERNS = [
        r"WIP.*?제한.*?(무시|초과)",
        r"(무시|초과).*?WIP",
        r"bypass.*?wip",
    ]

    def __init__(self, config: PolicyConfig = POLICY_CONFIG):
        self.config = config

    def check(
        self,
        message: str,
        sprint_status: Optional[str] = None,
        current_wip: Optional[int] = None,
        wip_limit: Optional[int] = None,
    ) -> PolicyCheckResult:
        """Check for scrum rule violations"""
        if not self.config.ENABLE_SCRUM_RULES:
            return PolicyCheckResult(action=PolicyAction.ALLOW)

        warnings = []
        message_lower = message.lower()

        # Check for sprint scope change during active sprint
        if sprint_status == "ACTIVE":
            for pattern in self.SPRINT_CHANGE_PATTERNS:
                if re.search(pattern, message, re.IGNORECASE):
                    warnings.append(
                        "Sprint scope change detected during active sprint. "
                        "Consider waiting until sprint review."
                    )
                    break

        # Check for WIP limit bypass attempts
        for pattern in self.WIP_VIOLATION_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                warnings.append(
                    "WIP limit bypass attempt detected. "
                    "WIP limits help maintain flow efficiency."
                )
                break

        # Check current WIP status
        if current_wip is not None and wip_limit is not None:
            if current_wip >= wip_limit:
                warnings.append(
                    f"WIP limit reached ({current_wip}/{wip_limit}). "
                    "Complete existing work before starting new tasks."
                )

        if warnings:
            return PolicyCheckResult(
                action=PolicyAction.WARN,
                warnings=warnings,
                metadata={"scrum_warnings": warnings}
            )

        return PolicyCheckResult(action=PolicyAction.ALLOW)


# =============================================================================
# Response Limiter
# =============================================================================

class ResponseLimiter:
    """Enforces response format and length limits"""

    def __init__(self, config: PolicyConfig = POLICY_CONFIG):
        self.config = config

    def check_request(self, message: str) -> PolicyCheckResult:
        """Check request before sending to LLM"""
        warnings = []

        # Check message length
        if len(message) > 10000:
            return PolicyCheckResult(
                action=PolicyAction.BLOCK,
                reason="Message too long (max 10000 characters)"
            )

        # Warn about very long messages
        if len(message) > 2000:
            warnings.append(f"Long message ({len(message)} chars) may affect response quality")

        if warnings:
            return PolicyCheckResult(
                action=PolicyAction.WARN,
                warnings=warnings
            )

        return PolicyCheckResult(action=PolicyAction.ALLOW)

    def check_response(self, response: str) -> PolicyCheckResult:
        """Check response before returning to user"""
        # Check response length
        if len(response) > self.config.MAX_RESPONSE_LENGTH:
            truncated = response[:self.config.MAX_RESPONSE_LENGTH] + "\n\n[Response truncated due to length]"
            return PolicyCheckResult(
                action=PolicyAction.MODIFY,
                reason="Response truncated due to length limit",
                modified_content=truncated,
                warnings=[f"Response truncated from {len(response)} to {self.config.MAX_RESPONSE_LENGTH} chars"]
            )

        if len(response) < self.config.MIN_RESPONSE_LENGTH:
            return PolicyCheckResult(
                action=PolicyAction.WARN,
                warnings=["Response may be too short to be helpful"]
            )

        return PolicyCheckResult(action=PolicyAction.ALLOW)


# =============================================================================
# Content Filter
# =============================================================================

class ContentFilter:
    """Filters inappropriate or dangerous content"""

    # Patterns that should be blocked
    BLOCKED_PATTERNS = [
        r"DROP\s+TABLE",
        r"DELETE\s+FROM",
        r";\s*--",
        r"<script>",
        r"javascript:",
    ]

    # Patterns that should trigger warnings
    WARNING_PATTERNS = [
        r"비밀번호",
        r"password",
        r"api\s*key",
        r"secret",
        r"credential",
    ]

    def __init__(self, config: PolicyConfig = POLICY_CONFIG):
        self.config = config

    def check(self, message: str) -> PolicyCheckResult:
        """Check for inappropriate content"""
        if not self.config.ENABLE_CONTENT_FILTERING:
            return PolicyCheckResult(action=PolicyAction.ALLOW)

        # Check blocked patterns
        for pattern in self.BLOCKED_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                logger.warning(f"Blocked pattern detected: {pattern}")
                return PolicyCheckResult(
                    action=PolicyAction.BLOCK,
                    reason="Potentially dangerous content detected",
                    metadata={"blocked_pattern": pattern}
                )

        # Check warning patterns
        warnings = []
        for pattern in self.WARNING_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                warnings.append(f"Sensitive content pattern: {pattern}")

        if warnings:
            return PolicyCheckResult(
                action=PolicyAction.WARN,
                warnings=warnings
            )

        return PolicyCheckResult(action=PolicyAction.ALLOW)


# =============================================================================
# Main Policy Engine
# =============================================================================

class PolicyEngine:
    """
    Main policy engine that orchestrates all policy checks.

    Usage:
        engine = PolicyEngine()
        result = engine.check_request(
            message="Tell me about project ABC",
            user_id="user-123",
            project_id="proj-456"
        )

        if not result.passed:
            return {"error": result.blocked_reason}

        # Use result.modified_message if PII was masked
        message = result.modified_message or original_message
    """

    def __init__(self, config: PolicyConfig = POLICY_CONFIG):
        self.config = config
        self.pii_masker = PIIMasker(config)
        self.scope_validator = ScopeValidator(config)
        self.scrum_enforcer = ScrumRuleEnforcer(config)
        self.response_limiter = ResponseLimiter(config)
        self.content_filter = ContentFilter(config)

    def check_request(
        self,
        message: str,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_permissions: Optional[List[str]] = None,
        user_projects: Optional[List[str]] = None,
        sprint_status: Optional[str] = None,
        current_wip: Optional[int] = None,
        wip_limit: Optional[int] = None,
    ) -> PolicyResult:
        """
        Run all policy checks on incoming request.

        Returns PolicyResult with aggregated results from all checks.
        """
        checks = {}
        all_warnings = []
        modified_message = message
        blocked = False
        blocked_reason = None

        # 1. Content filtering (first - block dangerous content)
        content_result = self.content_filter.check(message)
        checks["content_filter"] = content_result
        if content_result.action == PolicyAction.BLOCK:
            blocked = True
            blocked_reason = content_result.reason
        all_warnings.extend(content_result.warnings)

        # 2. PII masking
        if not blocked:
            pii_result = self.pii_masker.check(message)
            checks["pii_masker"] = pii_result
            if pii_result.modified_content:
                modified_message = pii_result.modified_content
            all_warnings.extend(pii_result.warnings)

        # 3. Scope validation
        if not blocked:
            scope_result = self.scope_validator.check(
                message=modified_message,
                user_id=user_id,
                project_id=project_id,
                user_permissions=user_permissions,
                user_projects=user_projects,
            )
            checks["scope_validator"] = scope_result
            if scope_result.action == PolicyAction.BLOCK:
                blocked = True
                blocked_reason = scope_result.reason
            all_warnings.extend(scope_result.warnings)

        # 4. Scrum rules
        if not blocked:
            scrum_result = self.scrum_enforcer.check(
                message=modified_message,
                sprint_status=sprint_status,
                current_wip=current_wip,
                wip_limit=wip_limit,
            )
            checks["scrum_enforcer"] = scrum_result
            all_warnings.extend(scrum_result.warnings)

        # 5. Request limits
        if not blocked:
            limit_result = self.response_limiter.check_request(modified_message)
            checks["response_limiter"] = limit_result
            if limit_result.action == PolicyAction.BLOCK:
                blocked = True
                blocked_reason = limit_result.reason
            all_warnings.extend(limit_result.warnings)

        # Determine final action
        if blocked:
            action = PolicyAction.BLOCK
        elif modified_message != message:
            action = PolicyAction.MODIFY
        elif all_warnings:
            action = PolicyAction.WARN
        else:
            action = PolicyAction.ALLOW

        return PolicyResult(
            passed=not blocked,
            action=action,
            checks=checks,
            blocked_reason=blocked_reason,
            modified_message=modified_message if modified_message != message else None,
            warnings=all_warnings,
        )

    def check_response(self, response: str) -> PolicyResult:
        """
        Run policy checks on outgoing response.
        """
        checks = {}
        all_warnings = []
        modified_response = response

        # 1. PII masking on response
        pii_result = self.pii_masker.check(response)
        checks["pii_masker"] = pii_result
        if pii_result.modified_content:
            modified_response = pii_result.modified_content
        all_warnings.extend(pii_result.warnings)

        # 2. Response limits
        limit_result = self.response_limiter.check_response(modified_response)
        checks["response_limiter"] = limit_result
        if limit_result.modified_content:
            modified_response = limit_result.modified_content
        all_warnings.extend(limit_result.warnings)

        # Determine final action
        if modified_response != response:
            action = PolicyAction.MODIFY
        elif all_warnings:
            action = PolicyAction.WARN
        else:
            action = PolicyAction.ALLOW

        return PolicyResult(
            passed=True,  # Response checks don't block
            action=action,
            checks=checks,
            modified_message=modified_response if modified_response != response else None,
            warnings=all_warnings,
        )


# =============================================================================
# Singleton instance
# =============================================================================

_policy_engine: Optional[PolicyEngine] = None


def get_policy_engine() -> PolicyEngine:
    """Get singleton policy engine instance"""
    global _policy_engine
    if _policy_engine is None:
        _policy_engine = PolicyEngine()
    return _policy_engine
