"""
MCP Module - Model Context Protocol Gateway and Registry

Provides:
- Tool registration and discovery
- Gateway for tool invocation with policies
- Rate limiting and access control
- Telemetry and observability

Architecture:
    Agent → MCPGateway → MCPRegistry → Tool
                │
                ├── Rate Limiting
                ├── Secret Management
                ├── Tenant Isolation
                ├── Cost Tracking
                └── Observability
"""

from typing import Dict, Any, List, Optional, Callable, Type
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ToolCategory(Enum):
    """Categories of MCP tools."""
    DATABASE = "database"
    LLM = "llm"
    EXTERNAL = "external"
    INTERNAL = "internal"
    UTILITY = "utility"


class AccessLevel(Enum):
    """Access levels for tools."""
    PUBLIC = "public"
    PROJECT = "project"
    TENANT = "tenant"
    ADMIN = "admin"


class InvocationStatus(Enum):
    """Status of tool invocation."""
    SUCCESS = "success"
    FAILED = "failed"
    RATE_LIMITED = "rate_limited"
    UNAUTHORIZED = "unauthorized"
    TIMEOUT = "timeout"


@dataclass
class ToolDefinition:
    """
    Definition of an MCP tool.

    Attributes:
        name: Unique tool name
        description: Tool description
        category: Tool category
        version: Tool version
        input_schema: JSON schema for input
        output_schema: JSON schema for output
        handler: Function to execute
        access_level: Required access level
        rate_limit: Max invocations per minute
        timeout_ms: Timeout in milliseconds
        cost_per_call: Estimated cost per call
        tags: Tool tags for discovery
    """
    name: str
    description: str
    category: ToolCategory
    version: str = "1.0.0"
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Dict[str, Any] = field(default_factory=dict)
    handler: Optional[Callable] = None
    access_level: AccessLevel = AccessLevel.PROJECT
    rate_limit: int = 60  # per minute
    timeout_ms: int = 30000
    cost_per_call: float = 0.0
    tags: List[str] = field(default_factory=list)
    enabled: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "version": self.version,
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
            "access_level": self.access_level.value,
            "rate_limit": self.rate_limit,
            "timeout_ms": self.timeout_ms,
            "cost_per_call": self.cost_per_call,
            "tags": self.tags,
            "enabled": self.enabled,
        }


@dataclass
class ToolInvocation:
    """
    Record of a tool invocation.

    Attributes:
        tool_name: Name of invoked tool
        invocation_id: Unique invocation ID
        tenant_id: Tenant ID
        user_id: User ID
        input_data: Input parameters
        output_data: Output result
        status: Invocation status
        latency_ms: Execution latency
        cost: Actual cost
        timestamp: Invocation timestamp
        error: Error message if failed
    """
    tool_name: str
    invocation_id: str
    tenant_id: str
    user_id: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    status: InvocationStatus = InvocationStatus.SUCCESS
    latency_ms: int = 0
    cost: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "invocation_id": self.invocation_id,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "status": self.status.value,
            "latency_ms": self.latency_ms,
            "cost": self.cost,
            "timestamp": self.timestamp,
            "error": self.error,
        }


@dataclass
class ToolPolicy:
    """
    Policy for tool usage.

    Attributes:
        tool_name: Tool name this policy applies to
        rate_limit_override: Override default rate limit
        allowed_tenants: List of allowed tenant IDs (empty = all)
        allowed_roles: List of allowed user roles
        data_scope: Data scope restriction
        audit_required: Whether to audit all calls
    """
    tool_name: str
    rate_limit_override: Optional[int] = None
    allowed_tenants: List[str] = field(default_factory=list)
    allowed_roles: List[str] = field(default_factory=list)
    data_scope: Optional[str] = None
    audit_required: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "rate_limit_override": self.rate_limit_override,
            "allowed_tenants": self.allowed_tenants,
            "allowed_roles": self.allowed_roles,
            "data_scope": self.data_scope,
            "audit_required": self.audit_required,
        }


# Import submodules
from .registry import MCPRegistry, get_registry, register_tool
from .gateway import MCPGateway, get_gateway


__all__ = [
    # Enums
    "ToolCategory",
    "AccessLevel",
    "InvocationStatus",
    # Data classes
    "ToolDefinition",
    "ToolInvocation",
    "ToolPolicy",
    # Registry
    "MCPRegistry",
    "get_registry",
    "register_tool",
    # Gateway
    "MCPGateway",
    "get_gateway",
]
