"""
MCP Registry - Tool Registration and Discovery

Provides:
- Tool registration with versioning
- Tool discovery by category/tags
- Schema validation
- Capability listing
"""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import logging
import threading

from . import (
    ToolDefinition,
    ToolCategory,
    AccessLevel,
    ToolPolicy,
)

logger = logging.getLogger(__name__)


class MCPRegistry:
    """
    Central registry for MCP tools.

    Manages tool registration, versioning, and discovery.

    Example:
        registry = MCPRegistry()

        # Register a tool
        registry.register(ToolDefinition(
            name="query_database",
            description="Execute SQL query",
            category=ToolCategory.DATABASE,
            handler=execute_sql,
        ))

        # Get tool
        tool = registry.get("query_database")

        # List by category
        db_tools = registry.list_by_category(ToolCategory.DATABASE)
    """

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._policies: Dict[str, ToolPolicy] = {}
        self._versions: Dict[str, List[str]] = {}  # tool_name -> [versions]
        self._lock = threading.Lock()

    def register(
        self,
        tool: ToolDefinition,
        policy: Optional[ToolPolicy] = None
    ) -> None:
        """
        Register a tool.

        Args:
            tool: Tool definition
            policy: Optional tool policy
        """
        with self._lock:
            key = f"{tool.name}@{tool.version}"

            if tool.name in self._tools:
                existing = self._tools[tool.name]
                logger.info(
                    f"Replacing tool '{tool.name}' "
                    f"(v{existing.version} -> v{tool.version})"
                )

            self._tools[tool.name] = tool

            # Track versions
            if tool.name not in self._versions:
                self._versions[tool.name] = []
            if tool.version not in self._versions[tool.name]:
                self._versions[tool.name].append(tool.version)

            # Register policy if provided
            if policy:
                self._policies[tool.name] = policy

            logger.info(
                f"Registered tool: {tool.name} v{tool.version} "
                f"({tool.category.value})"
            )

    def unregister(self, name: str) -> bool:
        """
        Unregister a tool.

        Args:
            name: Tool name

        Returns:
            True if unregistered, False if not found
        """
        with self._lock:
            if name not in self._tools:
                return False

            del self._tools[name]
            self._policies.pop(name, None)

            logger.info(f"Unregistered tool: {name}")
            return True

    def get(self, name: str, version: str = None) -> Optional[ToolDefinition]:
        """
        Get a tool by name.

        Args:
            name: Tool name
            version: Optional specific version

        Returns:
            Tool definition or None
        """
        return self._tools.get(name)

    def get_policy(self, name: str) -> Optional[ToolPolicy]:
        """Get policy for a tool."""
        return self._policies.get(name)

    def set_policy(self, policy: ToolPolicy) -> None:
        """Set or update policy for a tool."""
        with self._lock:
            self._policies[policy.tool_name] = policy

    def list_all(self) -> List[ToolDefinition]:
        """List all registered tools."""
        return list(self._tools.values())

    def list_by_category(self, category: ToolCategory) -> List[ToolDefinition]:
        """List tools by category."""
        return [t for t in self._tools.values() if t.category == category]

    def list_by_tags(self, tags: List[str]) -> List[ToolDefinition]:
        """List tools that have any of the specified tags."""
        return [
            t for t in self._tools.values()
            if any(tag in t.tags for tag in tags)
        ]

    def list_names(self) -> List[str]:
        """List all tool names."""
        return list(self._tools.keys())

    def search(self, query: str) -> List[ToolDefinition]:
        """
        Search tools by name or description.

        Args:
            query: Search query

        Returns:
            List of matching tools
        """
        query_lower = query.lower()
        return [
            t for t in self._tools.values()
            if query_lower in t.name.lower() or query_lower in t.description.lower()
        ]

    def get_schema(self, name: str) -> Optional[Dict[str, Any]]:
        """Get tool schema by name."""
        tool = self.get(name)
        if not tool:
            return None

        return {
            "name": tool.name,
            "description": tool.description,
            "input": tool.input_schema,
            "output": tool.output_schema,
        }

    def get_all_schemas(self) -> Dict[str, Dict[str, Any]]:
        """Get schemas for all tools."""
        return {name: self.get_schema(name) for name in self._tools}

    def get_versions(self, name: str) -> List[str]:
        """Get all versions of a tool."""
        return self._versions.get(name, [])

    def validate_input(self, name: str, input_data: Dict[str, Any]) -> bool:
        """
        Validate input against tool schema.

        Args:
            name: Tool name
            input_data: Input data to validate

        Returns:
            True if valid
        """
        tool = self.get(name)
        if not tool or not tool.input_schema:
            return True

        # Basic validation - check required fields
        required = tool.input_schema.get("required", [])
        properties = tool.input_schema.get("properties", {})

        for field in required:
            if field not in input_data:
                logger.warning(f"Missing required field '{field}' for tool '{name}'")
                return False

        return True

    def is_enabled(self, name: str) -> bool:
        """Check if a tool is enabled."""
        tool = self.get(name)
        return tool.enabled if tool else False

    def enable(self, name: str) -> bool:
        """Enable a tool."""
        with self._lock:
            tool = self.get(name)
            if tool:
                tool.enabled = True
                return True
            return False

    def disable(self, name: str) -> bool:
        """Disable a tool."""
        with self._lock:
            tool = self.get(name)
            if tool:
                tool.enabled = False
                return True
            return False

    def get_capabilities(self) -> Dict[str, Any]:
        """
        Get registry capabilities for MCP protocol.

        Returns:
            Capabilities dict for MCP handshake
        """
        return {
            "tools": [
                {
                    "name": t.name,
                    "description": t.description,
                    "inputSchema": t.input_schema,
                }
                for t in self._tools.values()
                if t.enabled
            ],
            "version": "1.0.0",
            "tool_count": len(self._tools),
            "categories": list(set(t.category.value for t in self._tools.values())),
        }

    def export_manifest(self) -> Dict[str, Any]:
        """Export registry as manifest."""
        return {
            "version": "1.0.0",
            "generated_at": datetime.utcnow().isoformat(),
            "tools": [t.to_dict() for t in self._tools.values()],
            "policies": [p.to_dict() for p in self._policies.values()],
        }


# Global registry instance
_global_registry: Optional[MCPRegistry] = None


def get_registry() -> MCPRegistry:
    """Get the global MCP registry."""
    global _global_registry
    if _global_registry is None:
        _global_registry = MCPRegistry()
    return _global_registry


def register_tool(
    name: str,
    description: str,
    category: ToolCategory = ToolCategory.INTERNAL,
    **kwargs
) -> Callable:
    """
    Decorator to register a function as an MCP tool.

    Example:
        @register_tool(
            name="get_project",
            description="Get project by ID",
            category=ToolCategory.DATABASE,
        )
        def get_project(project_id: str) -> Dict:
            ...
    """
    def decorator(func: Callable) -> Callable:
        tool = ToolDefinition(
            name=name,
            description=description,
            category=category,
            handler=func,
            **kwargs
        )
        get_registry().register(tool)
        return func

    return decorator
