"""
Lifecycle Manager - Resource Lifecycle Management

Provides:
- Resource registration and tracking
- State transitions with validation
- Version management
- Deprecation and retirement
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import threading
import logging
import uuid

from . import (
    LifecycleState,
    ResourceType,
    SemanticVersion,
    ResourceMetadata,
    LifecycleTransition,
    VALID_TRANSITIONS,
)

logger = logging.getLogger(__name__)


class LifecycleManager:
    """
    Manager for resource lifecycle.

    Handles resource registration, state transitions, versioning,
    and retirement policies.

    Example:
        manager = LifecycleManager()

        # Register a resource
        metadata = manager.register(
            name="weekly_report_workflow",
            resource_type=ResourceType.WORKFLOW,
            version="1.0.0",
        )

        # Activate
        manager.activate(metadata.id)

        # Deprecate with replacement
        manager.deprecate(metadata.id, "v2 available", replacement_id="new_id")

        # Retire
        manager.retire(metadata.id)
    """

    def __init__(self):
        """Initialize lifecycle manager."""
        self._resources: Dict[str, ResourceMetadata] = {}
        self._transitions: List[LifecycleTransition] = []
        self._lock = threading.Lock()

    def register(
        self,
        name: str,
        resource_type: ResourceType,
        version: str = "1.0.0",
        valid_from: datetime = None,
        valid_until: datetime = None,
        tags: List[str] = None,
    ) -> ResourceMetadata:
        """
        Register a new resource.

        Args:
            name: Resource name
            resource_type: Type of resource
            version: Initial version
            valid_from: When resource becomes valid
            valid_until: When resource expires
            tags: Resource tags

        Returns:
            Resource metadata
        """
        resource_id = str(uuid.uuid4())
        sem_version = SemanticVersion.parse(version)

        metadata = ResourceMetadata(
            id=resource_id,
            name=name,
            resource_type=resource_type,
            version=sem_version,
            state=LifecycleState.DRAFT,
            valid_from=valid_from.isoformat() if valid_from else None,
            valid_until=valid_until.isoformat() if valid_until else None,
            tags=tags or [],
        )

        with self._lock:
            self._resources[resource_id] = metadata

        logger.info(f"Registered resource: {name} ({resource_type.value}) v{version}")
        return metadata

    def get(self, resource_id: str) -> Optional[ResourceMetadata]:
        """Get resource by ID."""
        return self._resources.get(resource_id)

    def get_by_name(
        self,
        name: str,
        resource_type: ResourceType = None
    ) -> List[ResourceMetadata]:
        """Get resources by name."""
        results = []
        for resource in self._resources.values():
            if resource.name == name:
                if resource_type is None or resource.resource_type == resource_type:
                    results.append(resource)
        return results

    def list_all(
        self,
        resource_type: ResourceType = None,
        state: LifecycleState = None,
        include_invalid: bool = False,
    ) -> List[ResourceMetadata]:
        """
        List resources with optional filtering.

        Args:
            resource_type: Filter by type
            state: Filter by state
            include_invalid: Include invalid resources

        Returns:
            List of resources
        """
        results = []

        for resource in self._resources.values():
            if resource_type and resource.resource_type != resource_type:
                continue
            if state and resource.state != state:
                continue
            if not include_invalid and not resource.is_valid():
                continue
            results.append(resource)

        return results

    def activate(
        self,
        resource_id: str,
        actor: str = None,
        valid_from: datetime = None,
    ) -> bool:
        """
        Activate a resource.

        Args:
            resource_id: Resource ID
            actor: Who is activating
            valid_from: Optional start of validity

        Returns:
            True if activated
        """
        return self._transition(
            resource_id,
            LifecycleState.ACTIVE,
            actor=actor,
            reason="Activated for use",
            valid_from=valid_from,
        )

    def deprecate(
        self,
        resource_id: str,
        reason: str,
        replacement_id: str = None,
        actor: str = None,
        valid_until: datetime = None,
    ) -> bool:
        """
        Deprecate a resource.

        Args:
            resource_id: Resource ID
            reason: Deprecation reason
            replacement_id: ID of replacement resource
            actor: Who is deprecating
            valid_until: When to stop accepting

        Returns:
            True if deprecated
        """
        with self._lock:
            resource = self._resources.get(resource_id)
            if resource:
                resource.deprecation_reason = reason
                resource.replacement_id = replacement_id
                resource.deprecated_at = datetime.utcnow().isoformat()
                if valid_until:
                    resource.valid_until = valid_until.isoformat()

        return self._transition(
            resource_id,
            LifecycleState.DEPRECATED,
            actor=actor,
            reason=reason,
        )

    def retire(
        self,
        resource_id: str,
        actor: str = None,
        reason: str = None,
    ) -> bool:
        """
        Retire a resource (terminal state).

        Args:
            resource_id: Resource ID
            actor: Who is retiring
            reason: Retirement reason

        Returns:
            True if retired
        """
        return self._transition(
            resource_id,
            LifecycleState.RETIRED,
            actor=actor,
            reason=reason or "Resource retired",
        )

    def reactivate(
        self,
        resource_id: str,
        actor: str = None,
        reason: str = None,
    ) -> bool:
        """
        Reactivate a deprecated resource.

        Args:
            resource_id: Resource ID
            actor: Who is reactivating
            reason: Reactivation reason

        Returns:
            True if reactivated
        """
        with self._lock:
            resource = self._resources.get(resource_id)
            if resource:
                resource.deprecation_reason = None
                resource.deprecated_at = None

        return self._transition(
            resource_id,
            LifecycleState.ACTIVE,
            actor=actor,
            reason=reason or "Resource reactivated",
        )

    def bump_version(
        self,
        resource_id: str,
        bump_type: str = "patch",
        actor: str = None,
    ) -> Optional[SemanticVersion]:
        """
        Bump resource version.

        Args:
            resource_id: Resource ID
            bump_type: Type of bump (major, minor, patch)
            actor: Who is bumping

        Returns:
            New version or None
        """
        with self._lock:
            resource = self._resources.get(resource_id)
            if not resource:
                return None

            old_version = str(resource.version)

            if bump_type == "major":
                resource.version = resource.version.bump_major()
            elif bump_type == "minor":
                resource.version = resource.version.bump_minor()
            else:
                resource.version = resource.version.bump_patch()

            resource.updated_at = datetime.utcnow().isoformat()

            # Record transition
            transition = LifecycleTransition(
                resource_id=resource_id,
                from_state=resource.state,
                to_state=resource.state,
                from_version=old_version,
                to_version=str(resource.version),
                actor=actor,
                reason=f"Version bump ({bump_type})",
            )
            self._transitions.append(transition)

            logger.info(
                f"Bumped version: {resource.name} {old_version} -> {resource.version}"
            )
            return resource.version

    def _transition(
        self,
        resource_id: str,
        to_state: LifecycleState,
        actor: str = None,
        reason: str = None,
        valid_from: datetime = None,
    ) -> bool:
        """
        Perform state transition.

        Args:
            resource_id: Resource ID
            to_state: Target state
            actor: Who is performing transition
            reason: Reason for transition
            valid_from: Optional validity start

        Returns:
            True if transition successful
        """
        with self._lock:
            resource = self._resources.get(resource_id)
            if not resource:
                logger.error(f"Resource not found: {resource_id}")
                return False

            from_state = resource.state

            # Validate transition
            valid_next = VALID_TRANSITIONS.get(from_state, [])
            if to_state not in valid_next:
                logger.error(
                    f"Invalid transition: {from_state.value} -> {to_state.value}"
                )
                return False

            # Perform transition
            resource.state = to_state
            resource.updated_at = datetime.utcnow().isoformat()

            if valid_from:
                resource.valid_from = valid_from.isoformat()

            # Record transition
            transition = LifecycleTransition(
                resource_id=resource_id,
                from_state=from_state,
                to_state=to_state,
                from_version=str(resource.version),
                to_version=str(resource.version),
                actor=actor,
                reason=reason,
            )
            self._transitions.append(transition)

            logger.info(
                f"Transition: {resource.name} {from_state.value} -> {to_state.value}"
            )
            return True

    def get_history(
        self,
        resource_id: str = None,
        limit: int = 100,
    ) -> List[LifecycleTransition]:
        """
        Get transition history.

        Args:
            resource_id: Filter by resource (optional)
            limit: Maximum transitions to return

        Returns:
            List of transitions
        """
        history = self._transitions

        if resource_id:
            history = [t for t in history if t.resource_id == resource_id]

        return history[-limit:]

    def get_active_versions(
        self,
        name: str,
        resource_type: ResourceType = None,
    ) -> List[ResourceMetadata]:
        """
        Get all active versions of a resource.

        Args:
            name: Resource name
            resource_type: Optional type filter

        Returns:
            List of active resources
        """
        results = []

        for resource in self._resources.values():
            if resource.name == name and resource.state == LifecycleState.ACTIVE:
                if resource_type is None or resource.resource_type == resource_type:
                    results.append(resource)

        return sorted(results, key=lambda r: str(r.version), reverse=True)

    def get_replacement_chain(
        self,
        resource_id: str,
    ) -> List[ResourceMetadata]:
        """
        Get chain of replacements for a resource.

        Args:
            resource_id: Starting resource ID

        Returns:
            Chain of resources (oldest to newest)
        """
        chain = []
        current_id = resource_id

        while current_id:
            resource = self.get(current_id)
            if not resource:
                break

            chain.append(resource)
            current_id = resource.replacement_id

        return chain

    def cleanup_expired(self) -> int:
        """
        Retire all expired resources.

        Returns:
            Number of resources retired
        """
        count = 0
        now = datetime.utcnow().isoformat()

        with self._lock:
            for resource in list(self._resources.values()):
                if (resource.valid_until and
                    resource.valid_until < now and
                    resource.state != LifecycleState.RETIRED):

                    self._transition(
                        resource.id,
                        LifecycleState.RETIRED,
                        actor="system",
                        reason="Validity period expired",
                    )
                    count += 1

        if count > 0:
            logger.info(f"Cleaned up {count} expired resources")

        return count

    def get_stats(self) -> Dict[str, Any]:
        """Get lifecycle statistics."""
        stats = {
            "total_resources": len(self._resources),
            "by_state": {},
            "by_type": {},
            "total_transitions": len(self._transitions),
        }

        for state in LifecycleState:
            count = sum(1 for r in self._resources.values() if r.state == state)
            stats["by_state"][state.value] = count

        for rtype in ResourceType:
            count = sum(1 for r in self._resources.values() if r.resource_type == rtype)
            stats["by_type"][rtype.value] = count

        return stats


# Global manager instance
_global_manager: Optional[LifecycleManager] = None


def get_manager() -> LifecycleManager:
    """Get the global lifecycle manager."""
    global _global_manager
    if _global_manager is None:
        _global_manager = LifecycleManager()
    return _global_manager
