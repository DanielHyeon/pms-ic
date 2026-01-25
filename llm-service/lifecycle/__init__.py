"""
Lifecycle Module - Resource Lifecycle and Version Management

Provides:
- Semantic versioning for resources
- Lifecycle state management
- Validity period tracking
- Deprecation handling

Purpose:
Manage the lifecycle of AI resources (models, workflows, skills, tools)
to ensure consistency and graceful transitions.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class LifecycleState(Enum):
    """States in resource lifecycle."""
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    RETIRED = "retired"


class ResourceType(Enum):
    """Types of managed resources."""
    WORKFLOW = "workflow"
    SKILL = "skill"
    AGENT = "agent"
    TOOL = "tool"
    MODEL = "model"
    POLICY = "policy"


@dataclass
class SemanticVersion:
    """
    Semantic version (major.minor.patch).

    Attributes:
        major: Major version (breaking changes)
        minor: Minor version (new features)
        patch: Patch version (bug fixes)
    """
    major: int = 1
    minor: int = 0
    patch: int = 0

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"

    @classmethod
    def parse(cls, version_str: str) -> "SemanticVersion":
        """Parse version string."""
        parts = version_str.split(".")
        return cls(
            major=int(parts[0]) if len(parts) > 0 else 1,
            minor=int(parts[1]) if len(parts) > 1 else 0,
            patch=int(parts[2]) if len(parts) > 2 else 0,
        )

    def bump_major(self) -> "SemanticVersion":
        return SemanticVersion(self.major + 1, 0, 0)

    def bump_minor(self) -> "SemanticVersion":
        return SemanticVersion(self.major, self.minor + 1, 0)

    def bump_patch(self) -> "SemanticVersion":
        return SemanticVersion(self.major, self.minor, self.patch + 1)

    def is_compatible_with(self, other: "SemanticVersion") -> bool:
        """Check if this version is compatible with another."""
        return self.major == other.major

    def to_dict(self) -> Dict[str, int]:
        return {"major": self.major, "minor": self.minor, "patch": self.patch}


@dataclass
class ResourceMetadata:
    """
    Metadata for a managed resource.

    Attributes:
        id: Resource identifier
        name: Resource name
        resource_type: Type of resource
        version: Current version
        state: Lifecycle state
        created_at: Creation timestamp
        updated_at: Last update timestamp
        valid_from: When resource becomes valid
        valid_until: When resource expires
        deprecated_at: When resource was deprecated
        deprecation_reason: Reason for deprecation
        replacement_id: ID of replacement resource
        tags: Resource tags
    """
    id: str
    name: str
    resource_type: ResourceType
    version: SemanticVersion
    state: LifecycleState = LifecycleState.DRAFT
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    deprecated_at: Optional[str] = None
    deprecation_reason: Optional[str] = None
    replacement_id: Optional[str] = None
    tags: List[str] = field(default_factory=list)

    def is_valid(self) -> bool:
        """Check if resource is currently valid."""
        now = datetime.utcnow().isoformat()

        if self.state not in [LifecycleState.ACTIVE, LifecycleState.DEPRECATED]:
            return False

        if self.valid_from and now < self.valid_from:
            return False

        if self.valid_until and now > self.valid_until:
            return False

        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "resource_type": self.resource_type.value,
            "version": str(self.version),
            "state": self.state.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "valid_from": self.valid_from,
            "valid_until": self.valid_until,
            "deprecated_at": self.deprecated_at,
            "deprecation_reason": self.deprecation_reason,
            "replacement_id": self.replacement_id,
            "tags": self.tags,
            "is_valid": self.is_valid(),
        }


@dataclass
class LifecycleTransition:
    """
    Record of a lifecycle state transition.

    Attributes:
        resource_id: Resource identifier
        from_state: Previous state
        to_state: New state
        from_version: Previous version
        to_version: New version
        timestamp: When transition occurred
        actor: Who performed transition
        reason: Reason for transition
    """
    resource_id: str
    from_state: LifecycleState
    to_state: LifecycleState
    from_version: Optional[str] = None
    to_version: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    actor: Optional[str] = None
    reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "resource_id": self.resource_id,
            "from_state": self.from_state.value,
            "to_state": self.to_state.value,
            "from_version": self.from_version,
            "to_version": self.to_version,
            "timestamp": self.timestamp,
            "actor": self.actor,
            "reason": self.reason,
        }


# Valid state transitions
VALID_TRANSITIONS = {
    LifecycleState.DRAFT: [LifecycleState.ACTIVE],
    LifecycleState.ACTIVE: [LifecycleState.DEPRECATED, LifecycleState.RETIRED],
    LifecycleState.DEPRECATED: [LifecycleState.RETIRED, LifecycleState.ACTIVE],
    LifecycleState.RETIRED: [],  # Terminal state
}


# Import submodules
from .manager import LifecycleManager, get_manager


__all__ = [
    # Enums
    "LifecycleState",
    "ResourceType",
    # Data classes
    "SemanticVersion",
    "ResourceMetadata",
    "LifecycleTransition",
    # Constants
    "VALID_TRANSITIONS",
    # Manager
    "LifecycleManager",
    "get_manager",
]
