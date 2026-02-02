"""
MCP Gateway - Tool Invocation with Policies

Provides:
- Tool invocation with rate limiting
- Access control and tenant isolation
- Cost tracking
- Observability and telemetry
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import logging
import threading
import uuid
import time
import asyncio

from . import (
    ToolDefinition,
    ToolInvocation,
    ToolPolicy,
    InvocationStatus,
    AccessLevel,
)
from .registry import MCPRegistry, get_registry

logger = logging.getLogger(__name__)


@dataclass
class RateLimitState:
    """Rate limit tracking state."""
    count: int = 0
    window_start: datetime = field(default_factory=datetime.utcnow)


class MCPGateway:
    """
    Gateway for MCP tool invocation.

    Handles:
    - Rate limiting per tool/user
    - Access control based on roles and tenants
    - Invocation logging and telemetry
    - Cost tracking

    Example:
        gateway = MCPGateway(registry)

        # Invoke a tool
        result = await gateway.invoke(
            tool_name="query_database",
            input_data={"query": "SELECT * FROM users"},
            tenant_id="tenant1",
            user_id="user1",
            user_role="PM",
        )

        # Check rate limit
        can_invoke = gateway.check_rate_limit("query_database", "user1")
    """

    def __init__(self, registry: MCPRegistry = None):
        """
        Initialize gateway.

        Args:
            registry: MCP registry instance
        """
        self.registry = registry or get_registry()
        self._rate_limits: Dict[str, RateLimitState] = {}  # key -> state
        self._invocation_history: List[ToolInvocation] = []
        self._total_cost: float = 0.0
        self._lock = threading.Lock()

    async def invoke(
        self,
        tool_name: str,
        input_data: Dict[str, Any],
        tenant_id: str,
        user_id: str,
        user_role: str = "user",
        trace_id: str = None,
    ) -> Dict[str, Any]:
        """
        Invoke a tool through the gateway.

        Args:
            tool_name: Tool to invoke
            input_data: Tool input
            tenant_id: Tenant ID
            user_id: User ID
            user_role: User role
            trace_id: Optional trace ID

        Returns:
            Tool output or error dict
        """
        invocation_id = trace_id or str(uuid.uuid4())
        start_time = time.time()

        # Create invocation record
        invocation = ToolInvocation(
            tool_name=tool_name,
            invocation_id=invocation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            input_data=input_data,
        )

        try:
            # 1. Get tool definition
            tool = self.registry.get(tool_name)
            if not tool:
                invocation.status = InvocationStatus.FAILED
                invocation.error = f"Tool '{tool_name}' not found"
                self._record_invocation(invocation)
                return {"error": invocation.error, "status": "failed"}

            # 2. Check if enabled
            if not tool.enabled:
                invocation.status = InvocationStatus.FAILED
                invocation.error = f"Tool '{tool_name}' is disabled"
                self._record_invocation(invocation)
                return {"error": invocation.error, "status": "failed"}

            # 3. Check access control
            if not self._check_access(tool, tenant_id, user_role):
                invocation.status = InvocationStatus.UNAUTHORIZED
                invocation.error = "Access denied"
                self._record_invocation(invocation)
                return {"error": invocation.error, "status": "unauthorized"}

            # 4. Check rate limit
            if not self._check_rate_limit(tool_name, user_id):
                invocation.status = InvocationStatus.RATE_LIMITED
                invocation.error = "Rate limit exceeded"
                self._record_invocation(invocation)
                return {"error": invocation.error, "status": "rate_limited"}

            # 5. Validate input
            if not self.registry.validate_input(tool_name, input_data):
                invocation.status = InvocationStatus.FAILED
                invocation.error = "Invalid input"
                self._record_invocation(invocation)
                return {"error": invocation.error, "status": "failed"}

            # 6. Execute tool
            if tool.handler:
                if asyncio.iscoroutinefunction(tool.handler):
                    result = await asyncio.wait_for(
                        tool.handler(**input_data),
                        timeout=tool.timeout_ms / 1000
                    )
                else:
                    result = tool.handler(**input_data)
            else:
                result = {"message": f"Tool '{tool_name}' has no handler"}

            # 7. Record success
            elapsed_ms = int((time.time() - start_time) * 1000)
            invocation.status = InvocationStatus.SUCCESS
            invocation.output_data = result if isinstance(result, dict) else {"result": result}
            invocation.latency_ms = elapsed_ms
            invocation.cost = tool.cost_per_call

            self._record_invocation(invocation)
            self._update_rate_limit(tool_name, user_id)

            return {
                "result": result,
                "status": "success",
                "invocation_id": invocation_id,
                "latency_ms": elapsed_ms,
            }

        except asyncio.TimeoutError:
            invocation.status = InvocationStatus.TIMEOUT
            invocation.error = f"Timeout after {tool.timeout_ms}ms"
            self._record_invocation(invocation)
            return {"error": invocation.error, "status": "timeout"}

        except Exception as e:
            logger.error(f"Tool invocation error ({tool_name}): {e}")
            invocation.status = InvocationStatus.FAILED
            invocation.error = str(e)
            invocation.latency_ms = int((time.time() - start_time) * 1000)
            self._record_invocation(invocation)
            return {"error": str(e), "status": "failed"}

    def invoke_sync(
        self,
        tool_name: str,
        input_data: Dict[str, Any],
        tenant_id: str,
        user_id: str,
        user_role: str = "user",
    ) -> Dict[str, Any]:
        """Synchronous version of invoke."""
        return asyncio.run(
            self.invoke(tool_name, input_data, tenant_id, user_id, user_role)
        )

    def _check_access(
        self,
        tool: ToolDefinition,
        tenant_id: str,
        user_role: str
    ) -> bool:
        """Check if user has access to tool."""
        # Check tool access level
        if tool.access_level == AccessLevel.PUBLIC:
            return True

        if tool.access_level == AccessLevel.ADMIN:
            return user_role.lower() in ["admin", "system"]

        # Check policy if exists
        policy = self.registry.get_policy(tool.name)
        if policy:
            # Check tenant
            if policy.allowed_tenants and tenant_id not in policy.allowed_tenants:
                return False

            # Check role
            if policy.allowed_roles and user_role not in policy.allowed_roles:
                return False

        return True

    def _check_rate_limit(self, tool_name: str, user_id: str) -> bool:
        """Check if rate limit allows invocation."""
        tool = self.registry.get(tool_name)
        if not tool:
            return False

        key = f"{tool_name}:{user_id}"
        policy = self.registry.get_policy(tool_name)
        limit = policy.rate_limit_override if policy and policy.rate_limit_override else tool.rate_limit

        with self._lock:
            state = self._rate_limits.get(key)

            if not state:
                return True

            # Check if window expired
            window_duration = timedelta(minutes=1)
            if datetime.utcnow() - state.window_start > window_duration:
                return True

            return state.count < limit

    def _update_rate_limit(self, tool_name: str, user_id: str) -> None:
        """Update rate limit counter."""
        key = f"{tool_name}:{user_id}"

        with self._lock:
            state = self._rate_limits.get(key)
            now = datetime.utcnow()

            if not state or (now - state.window_start > timedelta(minutes=1)):
                self._rate_limits[key] = RateLimitState(count=1, window_start=now)
            else:
                state.count += 1

    def _record_invocation(self, invocation: ToolInvocation) -> None:
        """Record invocation for telemetry."""
        with self._lock:
            self._invocation_history.append(invocation)
            self._total_cost += invocation.cost

            # Keep only last 1000 invocations
            if len(self._invocation_history) > 1000:
                self._invocation_history = self._invocation_history[-1000:]

        # Log for audit
        policy = self.registry.get_policy(invocation.tool_name)
        if policy and policy.audit_required:
            logger.info(
                f"AUDIT: {invocation.tool_name} invoked by {invocation.user_id} "
                f"(status={invocation.status.value})"
            )

    def get_invocation_history(
        self,
        tool_name: str = None,
        user_id: str = None,
        limit: int = 100
    ) -> List[ToolInvocation]:
        """Get invocation history with optional filters."""
        history = self._invocation_history

        if tool_name:
            history = [i for i in history if i.tool_name == tool_name]

        if user_id:
            history = [i for i in history if i.user_id == user_id]

        return history[-limit:]

    def get_metrics(self) -> Dict[str, Any]:
        """Get gateway metrics."""
        with self._lock:
            total = len(self._invocation_history)
            successful = sum(
                1 for i in self._invocation_history
                if i.status == InvocationStatus.SUCCESS
            )
            failed = sum(
                1 for i in self._invocation_history
                if i.status == InvocationStatus.FAILED
            )

            avg_latency = 0
            if self._invocation_history:
                avg_latency = sum(i.latency_ms for i in self._invocation_history) / total

            return {
                "total_invocations": total,
                "successful": successful,
                "failed": failed,
                "success_rate": successful / total if total > 0 else 0,
                "avg_latency_ms": avg_latency,
                "total_cost": self._total_cost,
                "tools_registered": len(self.registry.list_all()),
            }

    def get_tool_stats(self, tool_name: str) -> Dict[str, Any]:
        """Get statistics for a specific tool."""
        invocations = [i for i in self._invocation_history if i.tool_name == tool_name]

        if not invocations:
            return {"tool_name": tool_name, "invocations": 0}

        successful = sum(1 for i in invocations if i.status == InvocationStatus.SUCCESS)
        total_latency = sum(i.latency_ms for i in invocations)
        total_cost = sum(i.cost for i in invocations)

        return {
            "tool_name": tool_name,
            "invocations": len(invocations),
            "successful": successful,
            "success_rate": successful / len(invocations),
            "avg_latency_ms": total_latency / len(invocations),
            "total_cost": total_cost,
        }

    def reset_rate_limits(self) -> None:
        """Reset all rate limits."""
        with self._lock:
            self._rate_limits.clear()

    def health_check(self) -> Dict[str, Any]:
        """Perform health check."""
        return {
            "status": "healthy",
            "registry_tools": len(self.registry.list_all()),
            "rate_limit_entries": len(self._rate_limits),
            "invocation_history_size": len(self._invocation_history),
        }


# Global gateway instance
_global_gateway: Optional[MCPGateway] = None


def get_gateway() -> MCPGateway:
    """Get the global MCP gateway."""
    global _global_gateway
    if _global_gateway is None:
        _global_gateway = MCPGateway()
    return _global_gateway
